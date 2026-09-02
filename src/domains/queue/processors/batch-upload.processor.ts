// @ts-ignore
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { OCR_BATCH_QUEUE, OCR_PROCESSING_QUEUE } from 'src/shared/common/ocr-enums.js';
import { S3Service } from 'src/shared/infrastructure/aws/s3.service.js';
import { TextractService } from 'src/shared/infrastructure/aws/textract.service.js';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity.js';
import { ClassificationService } from 'src/domains/classification/services/classification.service.js';
import { PdfSplitterService } from 'src/shared/utils/pdf-splitter.service.js';
import { BatchUploadJobData, OcrJobData } from '../ocr-queue.constants.js';

@Processor(OCR_BATCH_QUEUE)
export class BatchUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchUploadProcessor.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly textractService: TextractService,
    private readonly classificationService: ClassificationService,
    private readonly pdfSplitterService: PdfSplitterService,
    @InjectQueue(OCR_PROCESSING_QUEUE)
    private readonly ocrProcessingQueue: Queue<OcrJobData>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
  ) {
    super();
  }

  async process(job: Job<BatchUploadJobData>): Promise<any> {
    const { transactionId, serviceId, userId, s3Key, fileName } = job.data;
    this.logger.log(`Processing composite batch upload for transactionId=${transactionId}, file=${fileName}`);

    try {
      // 1. Download composite PDF from S3
      const fileBuffer = await this.s3Service.downloadFile(s3Key);

      // 2. Perform OCR on composite PDF
      let ocrResult;
      try {
        ocrResult = await this.textractService.extractTextFromS3(s3Key);
      } catch {
        ocrResult = await this.textractService.extractText(fileBuffer);
      }

      // Group text blocks by page
      const pagesMap = new Map<number, string>();
      for (const block of ocrResult.blocks) {
        const current = pagesMap.get(block.pageNumber) || '';
        pagesMap.set(block.pageNumber, current + (current ? '\n' : '') + block.text);
      }

      const pageTexts = Array.from(pagesMap.entries()).map(([pageNumber, text]) => ({
        pageNumber,
        text,
      }));

      // 3. Classify pages into requirement groups
      const groups = await this.classificationService.classifyMultiPageDocument(
        pageTexts,
        serviceId || '',
      );

      // Convert 1-based page numbers to 0-based for pdf-lib
      const splitGroups = groups.map(g => ({
        label: g.requirementName,
        pages: g.pages.map(p => p - 1),
        requirementId: g.requirementId,
      }));

      // 4. Split PDF into segments
      const splitPdfs = await this.pdfSplitterService.splitByPages(fileBuffer, splitGroups);

      // 5. Upload segments and create child Document entities
      const createdDocuments: DocumentEntity[] = [];

      for (let i = 0; i < splitPdfs.length; i++) {
        const split = splitPdfs[i];
        const groupInfo = splitGroups[i];
        const sanitizedLabel = split.label.replace(/[^a-zA-Z0-9_-]/g, '_');
        const splitKey = `transactions/${transactionId}/split_${sanitizedLabel}_${Date.now()}.pdf`;

        await this.s3Service.uploadFile(splitKey, split.buffer, 'application/pdf');

        const newDoc = this.documentRepo.create({
          fileURL: splitKey,
          category: 'REQUIREMENT',
          userId,
          fileSize: split.buffer.length,
          originalFileName: `${split.label}.pdf`,
          transactionId,
          requirementId: groupInfo.requirementId,
          type: 'application/pdf',
          ocrProcessed: false,
          ocrText: '',
          ocrConfidence: 0,
          ocrProcessFailedReason: null,
          ocrProcessedDate: new Date(),
        });

        const savedDoc = await this.documentRepo.save(newDoc);
        createdDocuments.push(savedDoc);

        // 6. Enqueue each split document into OCR processing queue
        await this.ocrProcessingQueue.add(`ocr-job-${savedDoc.id}`, {
          documentId: savedDoc.id,
          transactionId,
          serviceId,
          userId,
          s3Key: splitKey,
          fileName: savedDoc.originalFileName || `${split.label}.pdf`,
          fileSize: savedDoc.fileSize,
          fileType: 'application/pdf',
          requirementId: groupInfo.requirementId,
        });
      }

      this.logger.log(
        `Successfully split composite PDF into ${createdDocuments.length} document(s) for transactionId=${transactionId}`,
      );

      return {
        success: true,
        splitCount: createdDocuments.length,
        documentIds: createdDocuments.map(d => d.id),
      };
    } catch (error: any) {
      this.logger.error(`Error processing batch upload: ${error.message}`, error.stack);
      throw error;
    }
  }
}
