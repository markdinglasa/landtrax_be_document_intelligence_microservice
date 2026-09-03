import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  OCR_BATCH_QUEUE,
  OCR_PROCESSING_QUEUE,
  OCRAuditAction,
  OCRStatus,
} from '../../../../shared/common/ocr-enums.js';
import { AuditTrailService } from '../../../../shared/contracts/audit-trail.service.abstract.js';
import DocumentEntity from '../../../../shared/infrastructure/database/entities/document.entity.js';
import ExtractedFieldEntity from '../../../../shared/infrastructure/database/entities/extracted-field.entity.js';
import { ExtractionService } from '../../../extraction/services/extraction.service.js';
import { ValidationService } from '../../../validation/services/validation.service.js';
import { ProcessBatchDto } from '../../dtos/process-batch.dto.js';
import { ProcessReplacementDto } from '../../dtos/process-replacement.dto.js';
import { UpdateFieldDto } from '../../dtos/update-field.dto.js';
import { OcrService } from '../ocr.service.js';

describe('OcrService', () => {
  let service: OcrService;
  let mockOcrQueue: any;
  let mockBatchQueue: any;
  let mockValidationService: any;
  let mockExtractionService: any;
  let mockAuditTrailService: any;
  let mockDocRepo: any;
  let mockExtractedFieldRepo: any;

  beforeEach(async () => {
    mockOcrQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    mockBatchQueue = {
      add: jest.fn().mockResolvedValue({ id: 'batch-job-1' }),
    };

    mockValidationService = {
      checkDuplicate: jest.fn().mockResolvedValue({ isDuplicate: false }),
      validateFile: jest.fn().mockResolvedValue({ valid: true }),
    };

    mockExtractionService = {
      getFieldsByDocumentId: jest.fn().mockResolvedValue([]),
      deleteFieldsByDocumentId: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditTrailService = {
      create: jest.fn().mockResolvedValue({ success: true }),
    };

    mockDocRepo = {
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockExtractedFieldRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entities) => Promise.resolve(entities)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: getQueueToken(OCR_PROCESSING_QUEUE), useValue: mockOcrQueue },
        { provide: getQueueToken(OCR_BATCH_QUEUE), useValue: mockBatchQueue },
        { provide: ValidationService, useValue: mockValidationService },
        { provide: ExtractionService, useValue: mockExtractionService },
        { provide: AuditTrailService, useValue: mockAuditTrailService },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocRepo },
        { provide: getRepositoryToken(ExtractedFieldEntity), useValue: mockExtractedFieldRepo },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processBatch', () => {
    it('should reject duplicates and queue valid files (AC 3, 30-32, 42)', async () => {
      mockValidationService.checkDuplicate
        .mockResolvedValueOnce({ isDuplicate: false })
        .mockResolvedValueOnce({
          isDuplicate: true,
          message: 'The selected file has already been uploaded for this transaction.',
        });

      const dto: ProcessBatchDto = {
        transactionId: 'tx-100',
        serviceId: 'srv-1',
        userId: 'user-1',
        documents: [
          {
            documentId: 'doc-1',
            fileName: 'title.pdf',
            fileSize: 1024,
            fileType: 'application/pdf',
            s3Key: 'docs/title.pdf',
          },
          {
            documentId: 'doc-2',
            fileName: 'duplicate.pdf',
            fileSize: 2048,
            fileType: 'application/pdf',
            s3Key: 'docs/duplicate.pdf',
          },
        ],
      };

      const result = await service.processBatch(dto);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('QUEUED');
      expect(result.results[1].status).toBe('REJECTED');
      expect(result.results[1].message).toContain('already been uploaded');
      expect(mockOcrQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should pass requirementId and serviceId to checkDuplicate and reject duplicate requirement', async () => {
      mockValidationService.checkDuplicate.mockResolvedValueOnce({
        isDuplicate: true,
        message: "The requirement 'Transfer Certificate of Title' has already been processed for this transaction.",
      });

      const dto: ProcessBatchDto = {
        transactionId: 'tx-100',
        serviceId: 'srv-1',
        userId: 'user-1',
        documents: [
          {
            documentId: 'doc-dup-req',
            fileName: 'another-tct.pdf',
            fileSize: 1024,
            fileType: 'application/pdf',
            s3Key: 'docs/tct.pdf',
            requirementId: 'req-tct',
          },
        ],
      };

      const result = await service.processBatch(dto);

      expect(mockValidationService.checkDuplicate).toHaveBeenCalledWith(
        'another-tct.pdf',
        1024,
        'tx-100',
        'req-tct',
        'srv-1',
      );
      expect(result.results[0].status).toBe('REJECTED');
      expect(result.results[0].message).toContain('Transfer Certificate of Title');
      expect(mockOcrQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('processReplacement', () => {
    it('should validate and queue replacement file for single affected requirement (AC 38-48)', async () => {
      const dto: ProcessReplacementDto = {
        documentId: 'doc-failed',
        requirementId: 'req-tax-dec',
        transactionId: 'tx-100',
        serviceId: 'srv-1',
        userId: 'user-1',
        s3Key: 'docs/replacement.pdf',
        fileName: 'replacement.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
      };

      const result = await service.processReplacement(dto);

      expect(result.success).toBe(true);
      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-failed', expect.objectContaining({
        ocrProcessed: false,
        ocrProcessFailedReason: null,
      }));
      expect(mockOcrQueue.add).toHaveBeenCalledWith(
        'ocr-job-doc-failed',
        expect.objectContaining({ isReplacement: true }),
      );
    });
  });

  describe('getStatus', () => {
    it('should return mapped statuses for documents (AC 18-30)', async () => {
      mockDocRepo.find.mockResolvedValueOnce([
        { id: 'doc-1', ocrProcessed: false, ocrConfidence: 0, ocrProcessFailedReason: null },
        { id: 'doc-2', ocrProcessed: true, ocrConfidence: 95, ocrProcessFailedReason: null },
        { id: 'doc-3', ocrProcessed: true, ocrConfidence: 0, ocrText: '', ocrProcessFailedReason: 'Blank' },
      ]);

      const statuses = await service.getStatus(['doc-1', 'doc-2', 'doc-3']);

      expect(statuses).toHaveLength(3);
      expect(statuses[0].status).toBe(OCRStatus.PROCESSING);
      expect(statuses[1].status).toBe(OCRStatus.SUCCESS);
      expect(statuses[2].status).toBe(OCRStatus.NOT_READABLE);
    });
  });

  describe('updateField', () => {
    it('should manually update field, set isUserModified=true, and log audit trail (AC 21-24, 45-46)', async () => {
      const existingField = {
        id: 'f-1',
        documentId: 'doc-1',
        fieldName: 'Title No.',
        fieldValue: 'OLD-123',
        isUserModified: false,
      };
      mockExtractedFieldRepo.findOne.mockResolvedValueOnce(existingField);

      const dto: UpdateFieldDto = {
        documentId: 'doc-1',
        fieldName: 'Title No.',
        value: 'NEW-456',
        userId: 'user-1',
      };

      const result = await service.updateField(dto);

      expect(result.success).toBe(true);
      expect(existingField.fieldValue).toBe('NEW-456');
      expect(existingField.isUserModified).toBe(true);
      expect(mockAuditTrailService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: OCRAuditAction.VALUE_UPDATED,
      }));
    });
  });

  describe('removeDocumentOcr', () => {
    it('should remove OCR results and reset document OCR fields (AC 8-9)', async () => {
      await service.removeDocumentOcr('doc-1');

      expect(mockExtractionService.deleteFieldsByDocumentId).toHaveBeenCalledWith('doc-1');
      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-1', expect.objectContaining({
        ocrProcessed: false,
        ocrText: '',
      }));
    });
  });

  describe('handleReExecution', () => {
    it('should keep user modified values when overwrite=false (AC 38, 63)', async () => {
      mockExtractionService.getFieldsByDocumentId.mockResolvedValueOnce([
        { fieldName: 'Title No.', fieldValue: 'MANUAL-123', isUserModified: true },
      ]);

      const newFields = [
        { fieldName: 'Title No.', value: 'OCR-NEW-999', confidence: 0.95 },
      ];

      const saved = await service.handleReExecution('doc-1', newFields, false);

      expect(saved[0].fieldValue).toBe('MANUAL-123');
      expect(saved[0].isUserModified).toBe(true);
    });

    it('should overwrite user modified values when overwrite=true (AC 37, 62)', async () => {
      const existing = { fieldName: 'Title No.', fieldValue: 'MANUAL-123', isUserModified: true, confidence: 0 };
      mockExtractionService.getFieldsByDocumentId.mockResolvedValueOnce([existing]);

      const newFields = [
        { fieldName: 'Title No.', value: 'OCR-NEW-999', confidence: 0.95 },
      ];

      const saved = await service.handleReExecution('doc-1', newFields, true);

      expect(existing.fieldValue).toBe('OCR-NEW-999');
      expect(existing.isUserModified).toBe(false);
      expect(existing.confidence).toBe(0.95);
    });
  });

  describe('processCompositeBatch', () => {
    it('should enqueue composite PDF into batch queue', async () => {
      const jobData = {
        transactionId: 'tx-100',
        serviceId: 'srv-1',
        userId: 'u-1',
        s3Key: 'docs/composite.pdf',
        fileName: 'composite.pdf',
        fileSize: 5000,
        fileType: 'application/pdf',
      };

      const result = await service.processCompositeBatch(jobData);

      expect(result.success).toBe(true);
      expect(mockBatchQueue.add).toHaveBeenCalledWith('batch-split-tx-100', jobData);
    });
  });

  describe('getFields', () => {
    it('should delegate to extractionService.getFieldsByDocumentId', async () => {
      const mockFields = [{ id: 'f-1', fieldName: 'Title No.', fieldValue: '123' }];
      mockExtractionService.getFieldsByDocumentId.mockResolvedValueOnce(mockFields);

      const fields = await service.getFields('doc-1');

      expect(fields).toEqual(mockFields);
      expect(mockExtractionService.getFieldsByDocumentId).toHaveBeenCalledWith('doc-1');
    });
  });
});
