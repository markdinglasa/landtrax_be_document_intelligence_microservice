// @ts-ignore
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { ExtractionService } from '../../extraction/services/extraction.service.js';
import { BatchUploadJobData, OcrJobData } from '../../queue/ocr-queue.constants.js';
import { ValidationService } from '../../validation/services/validation.service.js';
import {
  OCR_BATCH_QUEUE,
  OCR_MODULE_NAME,
  OCR_PROCESSING_QUEUE,
  OCRAuditAction,
  OCRStatus,
} from '../../../shared/common/ocr-enums.js';
import { AuditTrailStatus } from '../../../shared/common/status.js';
import { AuditTrailService } from '../../../shared/contracts/audit-trail.service.abstract.js';
import DocumentEntity from '../../../shared/infrastructure/database/entities/document.entity.js';
import ExtractedFieldEntity from '../../../shared/infrastructure/database/entities/extracted-field.entity.js';
import { In, IsNull, Repository } from 'typeorm';
import { ProcessBatchDto } from '../dtos/process-batch.dto.js';
import { ProcessReplacementDto } from '../dtos/process-replacement.dto.js';
import { UpdateFieldDto } from '../dtos/update-field.dto.js';
import { IOcrService } from './ocr.service.abstract.js';

@Injectable()
export class OcrService extends IOcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @InjectQueue(OCR_PROCESSING_QUEUE)
    private readonly ocrProcessingQueue: Queue<OcrJobData>,
    @InjectQueue(OCR_BATCH_QUEUE)
    private readonly ocrBatchQueue: Queue<BatchUploadJobData>,
    private readonly validationService: ValidationService,
    private readonly extractionService: ExtractionService,
    private readonly auditTrailService: AuditTrailService,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(ExtractedFieldEntity)
    private readonly extractedFieldRepo: Repository<ExtractedFieldEntity>,
  ) {
    super();
  }

  /**
   * Process a batch of uploaded documents.
   * Validates each document, checks for duplicates, and enqueues valid documents.
   */
  async processBatch(dto: ProcessBatchDto): Promise<{
    success: boolean;
    results: {
      documentId: string;
      fileName: string;
      status: 'QUEUED' | 'REJECTED';
      message?: string;
    }[];
  }> {
    this.logger.log(
      `Processing batch upload of ${dto.documents.length} document(s) for transaction=${dto.transactionId}`,
    );
    const results: {
      documentId: string;
      fileName: string;
      status: 'QUEUED' | 'REJECTED';
      message?: string;
    }[] = [];

    for (const doc of dto.documents) {
      // 1. Duplicate check (FileName + FileSize)
      // + ExtractedFields check (AC 10-17) if requirement has exactly the same fields and values as an existing document in the same transaction
      const dupCheck = await this.validationService.checkDuplicate(
        doc.fileName,
        doc.fileSize,
        dto.transactionId,
      );

      if (dupCheck.isDuplicate) {
        results.push({
          documentId: doc.documentId,
          fileName: doc.fileName,
          status: 'REJECTED' as const,
          message: dupCheck.message,
        });
        continue;
      }

      // 2. Pre-validation against Requirement settings if requirementId provided
      if (doc.requirementId) {
        const valCheck = await this.validationService.validateFile(
          doc.fileName,
          doc.fileSize,
          doc.fileType,
          doc.requirementId,
        );

        if (!valCheck.valid) {
          results.push({
            documentId: doc.documentId,
            fileName: doc.fileName,
            status: 'REJECTED' as const,
            message: valCheck.message,
          });
          continue;
        }
      }

      // 3. Queue the successfully validated file for OCR processing
      await this.ocrProcessingQueue.add(`ocr-job-${doc.documentId}`, {
        documentId: doc.documentId,
        transactionId: dto.transactionId,
        serviceId: dto.serviceId,
        userId: dto.userId,
        s3Key: doc.s3Key,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        requirementId: doc.requirementId,
      });

      results.push({
        documentId: doc.documentId,
        fileName: doc.fileName,
        status: 'QUEUED' as const,
        message: 'Enqueued for OCR processing',
      });
    }

    return {
      success: results.some((r) => r.status === 'QUEUED'),
      results,
    };
  }

  /**
   * Process a single replacement document for a failed requirement within a multi-doc PDF (AC 38-48).
   */
  async processReplacement(dto: ProcessReplacementDto): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(
      `Processing replacement documentId=${dto.documentId} for requirement=${dto.requirementId}`,
    );

    // Validate replacement file against requirement validations (AC 40-41)
    const valCheck = await this.validationService.validateFile(
      dto.fileName,
      dto.fileSize,
      dto.fileType,
      dto.requirementId,
    );

    if (!valCheck.valid) {
      return {
        success: false,
        message: valCheck.message || 'Validation failed for replacement file',
      };
    }

    // Reset failure indicator on the document
    await this.documentRepo.update(dto.documentId, {
      ocrProcessed: false,
      ocrProcessFailedReason: null,
      fileURL: dto.s3Key,
      fileSize: dto.fileSize,
      originalFileName: dto.fileName,
    });

    // Enqueue only this replacement file for OCR processing (AC 44-46)
    await this.ocrProcessingQueue.add(`ocr-job-${dto.documentId}`, {
      documentId: dto.documentId,
      transactionId: dto.transactionId,
      serviceId: dto.serviceId,
      userId: dto.userId,
      s3Key: dto.s3Key,
      fileName: dto.fileName,
      fileSize: dto.fileSize,
      fileType: dto.fileType,
      requirementId: dto.requirementId,
      isReplacement: true,
    });

    return {
      success: true,
      message: 'Replacement file queued for OCR processing',
    };
  }

  /**
   * Submit a large composite multi-requirement PDF for segregation and batch processing.
   */
  async processCompositeBatch(
    jobData: BatchUploadJobData,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Enqueuing composite batch upload: ${jobData.fileName}`);
    await this.ocrBatchQueue.add(`batch-split-${jobData.transactionId}`, jobData);
    return {
      success: true,
      message: 'Composite PDF queued for segregation and OCR processing',
    };
  }

  /**
   * Get OCR statuses for a list of document IDs (AC 18-30).
   */
  async getStatus(documentIds: string[]): Promise<
    {
      documentId: string;
      status: OCRStatus;
      confidence: number;
      failedReason: string | null;
      processedDate: Date | null;
    }[]
  > {
    if (!documentIds || documentIds.length === 0) {
      return [];
    }

    const documents = await this.documentRepo.find({
      where: { id: In(documentIds), deletedDate: IsNull() },
    });

    return documents.map((doc) => {
      let status: OCRStatus = OCRStatus.PROCESSING;

      if (doc.ocrProcessed) {
        if (doc.ocrProcessFailedReason) {
          status =
            doc.ocrConfidence === 0 && doc.ocrText === ''
              ? OCRStatus.NOT_READABLE
              : OCRStatus.PROCESSING_FAILED;
        } else {
          status = OCRStatus.SUCCESS;
        }
      }

      return {
        documentId: doc.id,
        status,
        confidence: Number(doc.ocrConfidence || 0),
        failedReason: doc.ocrProcessFailedReason,
        processedDate: doc.ocrProcessedDate,
      };
    });
  }

  /**
   * Manually update an OCR field value (AC 21-24, 45-46).
   */
  async updateField(
    dto: UpdateFieldDto,
  ): Promise<{ success: boolean; field: ExtractedFieldEntity }> {
    this.logger.log(
      `User ${dto.userId} manually updating field "${dto.fieldName}" on document ${dto.documentId}`,
    );

    let field = await this.extractedFieldRepo.findOne({
      where: { documentId: dto.documentId, fieldName: dto.fieldName, deletedDate: IsNull() },
    });

    if (!field) {
      field = this.extractedFieldRepo.create({
        documentId: dto.documentId,
        fieldName: dto.fieldName,
        fieldValue: dto.value,
        isUserModified: true,
        extractedDate: new Date(),
      });
    } else {
      field.fieldValue = dto.value;
      field.isUserModified = true;
    }

    const savedField = await this.extractedFieldRepo.save(field);

    // Record Audit Trail for manual modification (AC 45-46)
    await this.auditTrailService.create({
      userId: dto.userId,
      action: OCRAuditAction.VALUE_UPDATED,
      entity: OCR_MODULE_NAME,
      details: JSON.stringify({
        documentId: dto.documentId,
        fieldName: dto.fieldName,
        newValue: dto.value,
      }),
      result: AuditTrailStatus.SUCCESS,
    });

    return {
      success: true,
      field: savedField,
    };
  }

  /**
   * Get all extracted OCR fields for a document.
   */
  async getFields(documentId: string): Promise<ExtractedFieldEntity[]> {
    return this.extractionService.getFieldsByDocumentId(documentId);
  }

  /**
   * Cascading delete of OCR results when a document is removed (AC 8-9).
   */
  async removeDocumentOcr(documentId: string): Promise<void> {
    this.logger.log(`Removing OCR results for document ${documentId}`);
    await this.extractionService.deleteFieldsByDocumentId(documentId);
    await this.documentRepo.update(documentId, {
      ocrProcessed: false,
      ocrText: '',
      ocrConfidence: 0,
      ocrProcessFailedReason: null,
    });
  }

  /**
   * Handle re-execution with Overwrite / Keep Existing Values resolution (AC 36-38, 60-63).
   */
  async handleReExecution(
    documentId: string,
    newExtractedFields: { fieldName: string; value: string | null; confidence: number }[],
    overwrite: boolean,
  ): Promise<ExtractedFieldEntity[]> {
    this.logger.log(`Handling re-execution for document ${documentId} (overwrite=${overwrite})`);

    const existingFields = await this.extractionService.getFieldsByDocumentId(documentId);
    const existingMap = new Map(existingFields.map((f) => [f.fieldName, f]));

    const fieldsToSave: ExtractedFieldEntity[] = [];

    for (const newField of newExtractedFields) {
      const existing = existingMap.get(newField.fieldName);

      if (existing) {
        if (existing.isUserModified && !overwrite) {
          // Keep existing user modified values (AC 38, 63)
          fieldsToSave.push(existing);
        } else {
          // Overwrite with newly extracted OCR results (AC 37, 62)
          existing.fieldValue = newField.value;
          existing.confidence = newField.confidence;
          existing.isUserModified = false;
          fieldsToSave.push(existing);
        }
      } else {
        const created = this.extractedFieldRepo.create({
          documentId,
          fieldName: newField.fieldName,
          fieldValue: newField.value,
          confidence: newField.confidence,
          isUserModified: false,
          extractedDate: new Date(),
        });
        fieldsToSave.push(created);
      }
    }

    return this.extractedFieldRepo.save(fieldsToSave);
  }
}
