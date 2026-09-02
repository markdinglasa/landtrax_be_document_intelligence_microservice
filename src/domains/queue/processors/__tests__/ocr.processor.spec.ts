import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import {
  OCRAuditAction,
  OCRFailureReason,
  OCRHistoryStatus,
  OCRStatus,
} from '../../../../shared/common/ocr-enums.js';
import { AuditTrailService } from '../../../../shared/contracts/audit-trail.service.abstract.js';
import { S3Service } from '../../../../shared/infrastructure/aws/s3.service.js';
import { TextractService } from '../../../../shared/infrastructure/aws/textract.service.js';
import DocumentEntity from '../../../../shared/infrastructure/database/entities/document.entity.js';
import OCRRequestHistoryEntity from '../../../../shared/infrastructure/database/entities/ocr-request-history.entity.js';
import RequirementEntity from '../../../../shared/infrastructure/database/entities/requirement.entity.js';
import { ClassificationService } from '../../../classification/services/classification.service.js';
import { ExtractionService } from '../../../extraction/services/extraction.service.js';
import { ValidationService } from '../../../validation/services/validation.service.js';
import { OcrProcessor } from '../ocr.processor.js';

describe('OcrProcessor', () => {
  let processor: OcrProcessor;
  let mockS3Service: any;
  let mockTextractService: any;
  let mockValidationService: any;
  let mockClassificationService: any;
  let mockExtractionService: any;
  let mockAuditTrailService: any;
  let mockDocRepo: any;
  let mockReqRepo: any;
  let mockOcrHistoryRepo: any;

  beforeEach(async () => {
    mockS3Service = {
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('sample pdf content')),
    };

    mockTextractService = {
      extractText: jest.fn().mockResolvedValue({
        text: 'TRANSFER CERTIFICATE OF TITLE No. 123456',
        confidence: 98.5,
        blocks: [],
      }),
      extractTextFromS3: jest.fn().mockResolvedValue({
        text: 'TRANSFER CERTIFICATE OF TITLE No. 123456',
        confidence: 98.5,
        blocks: [],
      }),
    };

    mockValidationService = {
      detectUnreadableConditions: jest.fn().mockReturnValue({ isReadable: true }),
    };

    mockClassificationService = {
      classifyDocument: jest.fn().mockResolvedValue({
        requirementId: 'req-title',
        requirementName: 'Transfer Certificate of Title',
        confidence: 0.95,
      }),
    };

    mockExtractionService = {
      extractFields: jest.fn().mockResolvedValue([
        { fieldName: 'Title No.', value: '123456', confidence: 0.99 },
      ]),
      saveExtractedFields: jest.fn().mockResolvedValue([]),
    };

    mockAuditTrailService = {
      create: jest.fn().mockResolvedValue({ success: true }),
    };

    mockDocRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockReqRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'req-title', name: 'Transfer Certificate of Title' }),
    };

    mockOcrHistoryRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrProcessor,
        { provide: S3Service, useValue: mockS3Service },
        { provide: TextractService, useValue: mockTextractService },
        { provide: ValidationService, useValue: mockValidationService },
        { provide: ClassificationService, useValue: mockClassificationService },
        { provide: ExtractionService, useValue: mockExtractionService },
        { provide: AuditTrailService, useValue: mockAuditTrailService },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocRepo },
        { provide: getRepositoryToken(RequirementEntity), useValue: mockReqRepo },
        { provide: getRepositoryToken(OCRRequestHistoryEntity), useValue: mockOcrHistoryRepo },
      ],
    }).compile();

    processor = module.get<OcrProcessor>(OcrProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process (happy path)', () => {
    it('should complete full OCR extraction and log success audit trail (AC 19, 43-44)', async () => {
      const mockJob = {
        data: {
          documentId: 'doc-1',
          transactionId: 'tx-100',
          serviceId: 'srv-title-transfer',
          userId: 'user-1',
          s3Key: 'docs/doc-1.pdf',
          fileName: 'title.pdf',
          requirementId: 'req-title',
        },
      } as unknown as Job;

      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.status).toBe(OCRStatus.SUCCESS);
      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-1', expect.objectContaining({
        ocrProcessed: true,
        ocrConfidence: 98.5,
      }));
      expect(mockOcrHistoryRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-1',
        status: OCRHistoryStatus.SUCCESS,
      }));
      expect(mockAuditTrailService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: OCRAuditAction.EXTRACTION_COMPLETED,
      }));
    });
  });

  describe('process (unreadable document)', () => {
    it('should handle unreadable document gracefully, create blank fields, and log unreadable audit trail (AC 1-15, 64-69)', async () => {
      mockValidationService.detectUnreadableConditions.mockReturnValueOnce({
        isReadable: false,
        failureReason: OCRFailureReason.BLANK_DOCUMENT,
      });

      const mockJob = {
        data: {
          documentId: 'doc-blank',
          transactionId: 'tx-100',
          serviceId: 'srv-title-transfer',
          userId: 'user-1',
          s3Key: 'docs/blank.pdf',
          fileName: 'blank.pdf',
          requirementId: 'req-title',
        },
      } as unknown as Job;

      const result = await processor.process(mockJob);

      expect(result.success).toBe(false);
      expect(result.status).toBe(OCRStatus.NOT_READABLE);
      expect(result.failureReason).toBe(OCRFailureReason.BLANK_DOCUMENT);

      // Verify document was updated with failure reason but not deleted (AC 4, 5)
      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-blank', expect.objectContaining({
        ocrProcessed: true,
        ocrProcessFailedReason: OCRFailureReason.BLANK_DOCUMENT,
      }));

      // Verify blank fields were created (AC 11, 12)
      expect(mockExtractionService.saveExtractedFields).toHaveBeenCalled();

      // Verify OCRRequestHistory entry (AC 64-69)
      expect(mockOcrHistoryRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-blank',
        status: OCRHistoryStatus.NOT_READABLE,
        errorMessage: OCRFailureReason.BLANK_DOCUMENT,
      }));

      // Verify Audit Trail entry (AC 66-69)
      expect(mockAuditTrailService.create).toHaveBeenCalledWith(expect.objectContaining({
        action: OCRAuditAction.DOCUMENT_NOT_READABLE,
      }));
    });

    it('should catch unexpected errors, persist error status on document, and re-throw (AC 27, 28)', async () => {
      mockTextractService.extractTextFromS3.mockRejectedValueOnce(new Error('Textract service down'));
      mockTextractService.extractText.mockRejectedValueOnce(new Error('Textract service down'));

      const mockJob = {
        data: {
          documentId: 'doc-err',
          transactionId: 'tx-100',
          serviceId: 'srv-1',
          userId: 'user-1',
          s3Key: 'docs/err.pdf',
          fileName: 'err.pdf',
          requirementId: 'req-title',
        },
      } as unknown as Job;

      await expect(processor.process(mockJob)).rejects.toThrow('Textract service down');

      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-err', expect.objectContaining({
        ocrProcessed: true,
        ocrProcessFailedReason: 'Textract service down',
      }));

      expect(mockOcrHistoryRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-err',
        status: OCRHistoryStatus.FAILED_OCR,
      }));
    });
  });
});
