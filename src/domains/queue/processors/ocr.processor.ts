// @ts-ignore
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import {
  OCR_PROCESSING_QUEUE,
  OCR_MODULE_NAME,
  OCRAuditAction,
  OCRFailureReason,
  OCRHistoryStatus,
  OCRStatus,
} from 'src/shared/common/ocr-enums.js';
import { AuditTrailStatus } from 'src/shared/common/status.js';
import { AuditTrailService } from 'src/shared/contracts/audit-trail.service.abstract.js';
import { S3Service } from 'src/shared/infrastructure/aws/s3.service.js';
import { TextractService } from 'src/shared/infrastructure/aws/textract.service.js';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity.js';
import OCRRequestHistoryEntity from 'src/shared/infrastructure/database/entities/ocr-request-history.entity.js';
import RequirementEntity from 'src/shared/infrastructure/database/entities/requirement.entity.js';
import { ClassificationService } from 'src/domains/classification/services/classification.service.js';
import { ExtractionService } from 'src/domains/extraction/services/extraction.service.js';
import { ValidationService } from 'src/domains/validation/services/validation.service.js';
import { OcrJobData } from '../ocr-queue.constants.js';

@Processor(OCR_PROCESSING_QUEUE)
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly s3Service: S3Service,
    private readonly textractService: TextractService,
    private readonly validationService: ValidationService,
    private readonly classificationService: ClassificationService,
    private readonly extractionService: ExtractionService,
    private readonly auditTrailService: AuditTrailService,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(RequirementEntity)
    private readonly requirementRepo: Repository<RequirementEntity>,
    @InjectRepository(OCRRequestHistoryEntity)
    private readonly ocrHistoryRepo: Repository<OCRRequestHistoryEntity>,
  ) {
    super();
  }

  async process(job: Job<OcrJobData>): Promise<any> {
    const {
      documentId,
      transactionId,
      serviceId,
      userId,
      s3Key,
      fileName,
      requirementId: initialRequirementId,
    } = job.data;

    this.logger.log(`Starting OCR processing for documentId=${documentId}, file=${fileName}`);

    let activeRequirementId = initialRequirementId;
    let requirementName = 'Unknown Requirement';

    if (activeRequirementId) {
      const req = await this.requirementRepo.findOne({ where: { id: activeRequirementId } });
      if (req) {
        requirementName = req.name;
      }
    }

    try {
      // 1. Download file from S3
      const fileBuffer = await this.s3Service.downloadFile(s3Key);

      // 2. Pre-check for unreadable conditions (Blank, password-protected, etc.)
      const unreadableCheck = this.validationService.detectUnreadableConditions(fileBuffer, fileName);
      if (!unreadableCheck.isReadable) {
        const failureReason = unreadableCheck.failureReason || OCRFailureReason.TEXT_EXTRACTION_FAILED;
        this.logger.warn(`Document ${documentId} is unreadable: ${failureReason}`);

        await this.handleUnreadableDocument(documentId, userId, transactionId, requirementName, fileName, failureReason, serviceId, activeRequirementId);
        return {
          success: false,
          status: OCRStatus.NOT_READABLE,
          failureReason,
        };
      }

      // 3. Perform OCR via Textract
      let ocrResult;
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        try {
          ocrResult = await this.textractService.extractTextFromS3(s3Key);
        } catch {
          ocrResult = await this.textractService.extractText(fileBuffer);
        }
      } else {
        ocrResult = await this.textractService.extractText(fileBuffer);
      }

      if (!ocrResult || !ocrResult.text || ocrResult.text.trim().length === 0) {
        const failureReason = OCRFailureReason.TEXT_EXTRACTION_FAILED;
        await this.handleUnreadableDocument(documentId, userId, transactionId, requirementName, fileName, failureReason, serviceId, activeRequirementId);
        return {
          success: false,
          status: OCRStatus.NOT_READABLE,
          failureReason,
        };
      }

      // 4. Document Classification (if not already classified)
      if (!activeRequirementId && serviceId) {
        const classification = await this.classificationService.classifyDocument(ocrResult.text, serviceId);
        if (classification) {
          activeRequirementId = classification.requirementId;
          requirementName = classification.requirementName;
          await this.documentRepo.update(documentId, {
            requirementId: activeRequirementId,
          });
        }
      }

      // 5. Field Extraction
      let extractedFields: { fieldName: string; value: string | null; confidence: number }[] = [];
      if (activeRequirementId && serviceId) {
        extractedFields = await this.extractionService.extractFields(ocrResult.text, activeRequirementId, serviceId);
        await this.extractionService.saveExtractedFields(documentId, extractedFields);
      }

      // 6. Update Document entity
      await this.documentRepo.update(documentId, {
        ocrProcessed: true,
        ocrText: ocrResult.text.substring(0, 255), // schema varchar(255)
        ocrConfidence: Number(ocrResult.confidence.toFixed(2)),
        ocrProcessFailedReason: null,
        ocrProcessedDate: new Date(),
      });

      // 7. Log to OCRRequestHistory
      await this.ocrHistoryRepo.save(
        this.ocrHistoryRepo.create({
          documentId,
          userId,
          status: OCRHistoryStatus.SUCCESS,
          response: JSON.stringify(extractedFields),
          payload: JSON.stringify({ fileName, s3Key, serviceId, requirementId: activeRequirementId }),
          errorMessage: null,
          timestamp: new Date(),
        }),
      );

      // 8. Record Audit Trail
      await this.auditTrailService.create({
        userId,
        action: OCRAuditAction.EXTRACTION_COMPLETED,
        entity: OCR_MODULE_NAME,
        details: JSON.stringify({
          transactionId,
          requirementName,
          fileName,
          ocrStatus: OCRStatus.SUCCESS,
          fieldsExtracted: extractedFields.length,
        }),
        result: AuditTrailStatus.SUCCESS,
      });

      this.logger.log(`OCR processing completed successfully for documentId=${documentId}`);
      return {
        success: true,
        status: OCRStatus.SUCCESS,
        extractedCount: extractedFields.length,
      };
    } catch (error: any) {
      this.logger.error(`Error processing OCR for documentId=${documentId}: ${error.message}`, error.stack);

      // Persist failure info on document
      await this.documentRepo.update(documentId, {
        ocrProcessed: true,
        ocrProcessFailedReason: error.message,
        ocrProcessedDate: new Date(),
      });

      // Log to OCRRequestHistory
      await this.ocrHistoryRepo.save(
        this.ocrHistoryRepo.create({
          documentId,
          userId,
          status: OCRHistoryStatus.FAILED_OCR,
          response: null,
          payload: JSON.stringify({ fileName, s3Key }),
          errorMessage: error.message,
          timestamp: new Date(),
        }),
      );

      // Record Audit Trail
      await this.auditTrailService.create({
        userId,
        action: OCRAuditAction.EXTRACTION_COMPLETED,
        entity: OCR_MODULE_NAME,
        details: JSON.stringify({
          transactionId,
          requirementName,
          fileName,
          ocrStatus: OCRStatus.PROCESSING_FAILED,
          failureReason: error.message,
        }),
        result: AuditTrailStatus.ERROR,
      });

      // Re-throw so BullMQ can handle retry/DLQ if configured, but document is preserved
      throw error;
    }
  }

  private async handleUnreadableDocument(
    documentId: string,
    userId: string,
    transactionId: string,
    requirementName: string,
    fileName: string,
    failureReason: string,
    serviceId?: string | null,
    requirementId?: string | null,
  ): Promise<void> {
    // 1. Update Document entity
    await this.documentRepo.update(documentId, {
      ocrProcessed: true,
      ocrText: '',
      ocrConfidence: 0,
      ocrProcessFailedReason: failureReason,
      ocrProcessedDate: new Date(),
    });

    // 2. Create blank configured fields if requirement is known
    if (requirementId && serviceId) {
      const blankFields = await this.extractionService.extractFields('', requirementId, serviceId);
      if (blankFields && blankFields.length > 0) {
        await this.extractionService.saveExtractedFields(documentId, blankFields);
      }
    }

    // 3. Log to OCRRequestHistory
    await this.ocrHistoryRepo.save(
      this.ocrHistoryRepo.create({
        documentId,
        userId,
        status: OCRHistoryStatus.NOT_READABLE,
        response: null,
        payload: JSON.stringify({ fileName, failureReason }),
        errorMessage: failureReason,
        timestamp: new Date(),
      }),
    );

    // 4. Record Audit Trail
    await this.auditTrailService.create({
      userId,
      action: OCRAuditAction.DOCUMENT_NOT_READABLE,
      entity: OCR_MODULE_NAME,
      details: JSON.stringify({
        transactionNumber: transactionId,
        requirementName,
        fileName,
        failureReason,
        ocrStatus: OCRStatus.NOT_READABLE,
      }),
      result: AuditTrailStatus.FAILED,
    });
  }
}
