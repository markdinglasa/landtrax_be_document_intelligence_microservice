// @ts-ignore
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { IsNull, LessThan, Repository } from 'typeorm';
import { OCR_BATCH_QUEUE, OCR_PROCESSING_QUEUE } from '../../../shared/common/ocr-enums.js';
import DocumentEntity from '../../../shared/infrastructure/database/entities/document.entity.js';
import TransactionServiceEntity from '../../../shared/infrastructure/database/entities/transaction-service.entity.js';
import { BatchUploadJobData, OcrJobData } from '../../queue/ocr-queue.constants.js';

export interface ReconciliationResult {
  scanned: number;
  enqueuedBatch: number;
  enqueuedSingle: number;
  skipped: number;
}

@Injectable()
export class OcrReconciliationService {
  private readonly logger = new Logger(OcrReconciliationService.name);
  private isRunning = false;

  constructor(
    @InjectQueue(OCR_BATCH_QUEUE)
    private readonly ocrBatchQueue: Queue<BatchUploadJobData>,
    @InjectQueue(OCR_PROCESSING_QUEUE)
    private readonly ocrProcessingQueue: Queue<OcrJobData>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(TransactionServiceEntity)
    private readonly transactionServiceRepo: Repository<TransactionServiceEntity>,
  ) {}

  /**
   * Fallback cron job running every 15 minutes (or custom interval).
   * Scans for stuck/pending OCR documents older than 15 minutes and re-enqueues up to 50 items.
   */
  @Cron(process.env.OCR_RECONCILIATION_CRON || '*/1 * * * *')
  async handleCron(): Promise<ReconciliationResult> {
    if (this.isRunning) {
      this.logger.warn('Previous OCR reconciliation job is still running. Skipping this cycle.');
      return { scanned: 0, enqueuedBatch: 0, enqueuedSingle: 0, skipped: 0 };
    }

    this.isRunning = true;
    try {
      this.logger.log('=== Starting OCR Fallback Reconciliation Cron Job ===');
      const result = await this.reconcilePendingDocuments();
      this.logger.log(
        `=== Finished OCR Fallback Reconciliation: Scanned=${result.scanned}, BatchEnqueued=${result.enqueuedBatch}, SingleEnqueued=${result.enqueuedSingle}, Skipped=${result.skipped} ===`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(`Error during OCR reconciliation: ${error.message}`, error.stack);
      return { scanned: 0, enqueuedBatch: 0, enqueuedSingle: 0, skipped: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Main reconciliation logic.
   * Can be invoked by Cron or manually via API/testing.
   */
  async reconcilePendingDocuments(
    stuckThresholdMinutes = 15,
    batchSize = 50,
  ): Promise<ReconciliationResult> {
    const thresholdDate = new Date(Date.now() - stuckThresholdMinutes * 60 * 1000);

    // Find up to `batchSize` stuck OCR documents (only where isOCR === true) older than `thresholdDate`
    const stuckDocuments = await this.documentRepo.find({
      where: {
        isOCR: true,
        ocrProcessed: false,
        deletedDate: IsNull(),
        createdDate: LessThan(thresholdDate),
      },
      order: {
        createdDate: 'ASC',
      },
      take: batchSize,
    });

    if (stuckDocuments.length === 0) {
      this.logger.log('No stuck OCR documents found.');
      return { scanned: 0, enqueuedBatch: 0, enqueuedSingle: 0, skipped: 0 };
    }

    this.logger.log(`Found ${stuckDocuments.length} stuck OCR document(s) for reconciliation.`);

    let enqueuedBatch = 0;
    let enqueuedSingle = 0;
    let skipped = 0;

    for (const doc of stuckDocuments) {
      // Check retry guard to prevent infinite loops (max 3 retries)
      const currentNotes = doc.notes || '';
      const retryMatch = new RegExp(/Reconciliation Attempt (\d+)/).exec(currentNotes);
      const attemptCount = retryMatch ? Number.parseInt(retryMatch[1], 10) : 0;

      if (attemptCount >= 3) {
        this.logger.warn(
          `Document ${doc.id} reached maximum reconciliation attempts (${attemptCount}). Marking as permanently failed.`,
        );
        await this.documentRepo.update(doc.id, {
          ocrProcessed: true,
          ocrProcessFailedReason: 'Max reconciliation retries exceeded (3 attempts)',
          notes: 'OCR - Failed (Max retries exceeded)',
          ocrProcessedDate: new Date(),
        });
        skipped++;
        continue;
      }

      const nextAttempt = attemptCount + 1;
      const nextNotes = `OCR - Reconciled (Reconciliation Attempt ${nextAttempt})`;

      // Resolve serviceId from transactionServiceId if not present
      let serviceId: string | null = null;
      if (doc.transactionServiceId) {
        const txService = await this.transactionServiceRepo.findOne({
          where: { id: doc.transactionServiceId },
        });
        if (txService) {
          serviceId = txService.serviceId;
        }
      }

      if (doc.category === 'COMPOSITE') {
        // Enqueue to batch queue for segregation
        await this.ocrBatchQueue.add(
          `batch-reconcile-${doc.id}-${Date.now()}`,
          {
            transactionId: doc.transactionId,
            transactionServiceId: doc.transactionServiceId || null,
            serviceId,
            documentId: doc.id,
            userId: doc.userId,
            s3Key: doc.fileURL,
            fileName: doc.originalFileName || 'composite_document.pdf',
            fileSize: Number(doc.fileSize || 0),
            fileType: doc.type || 'application/pdf',
          },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 3000 },
          },
        );

        await this.documentRepo.update(doc.id, { notes: nextNotes });
        enqueuedBatch++;
        this.logger.log(
          `Re-enqueued COMPOSITE document ${doc.id} (Attempt ${nextAttempt}) to batch queue.`,
        );
      } else {
        // Enqueue to single processing queue
        await this.ocrProcessingQueue.add(
          `ocr-reconcile-${doc.id}-${Date.now()}`,
          {
            documentId: doc.id,
            transactionId: doc.transactionId,
            transactionServiceId: doc.transactionServiceId || null,
            serviceId,
            userId: doc.userId,
            s3Key: doc.fileURL,
            fileName: doc.originalFileName || 'document.pdf',
            fileSize: Number(doc.fileSize || 0),
            fileType: doc.type || 'application/pdf',
            requirementId: doc.requirementId || null,
          },
          {
            attempts: 2,
            backoff: { type: 'exponential', delay: 3000 },
          },
        );

        await this.documentRepo.update(doc.id, { notes: nextNotes });
        enqueuedSingle++;
        this.logger.log(
          `Re-enqueued REQUIREMENT document ${doc.id} (Attempt ${nextAttempt}) to OCR processing queue.`,
        );
      }
    }

    return {
      scanned: stuckDocuments.length,
      enqueuedBatch,
      enqueuedSingle,
      skipped,
    };
  }
}
