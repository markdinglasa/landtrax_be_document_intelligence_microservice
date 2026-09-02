import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { OCR_PROCESSING_QUEUE } from '../../../../shared/common/ocr-enums.js';
import { S3Service } from '../../../../shared/infrastructure/aws/s3.service.js';
import { TextractService } from '../../../../shared/infrastructure/aws/textract.service.js';
import DocumentEntity from '../../../../shared/infrastructure/database/entities/document.entity.js';
import { ClassificationService } from '../../../classification/services/classification.service.js';
import { PdfSplitterService } from '../../../../shared/utils/pdf-splitter.service.js';
import { BatchUploadProcessor } from '../batch-upload.processor.js';

describe('BatchUploadProcessor', () => {
  let processor: BatchUploadProcessor;
  let mockS3Service: any;
  let mockTextractService: any;
  let mockClassificationService: any;
  let mockPdfSplitterService: any;
  let mockOcrQueue: any;
  let mockDocRepo: any;

  beforeEach(async () => {
    mockS3Service = {
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('composite pdf')),
      uploadFile: jest.fn().mockResolvedValue('split-key.pdf'),
    };

    mockTextractService = {
      extractTextFromS3: jest.fn().mockResolvedValue({
        text: 'Page 1 text\nPage 2 text',
        confidence: 95,
        blocks: [
          { text: 'Page 1 text', confidence: 95, pageNumber: 1 },
          { text: 'Page 2 text', confidence: 95, pageNumber: 2 },
        ],
      }),
    };

    mockClassificationService = {
      classifyMultiPageDocument: jest.fn().mockResolvedValue([
        { requirementId: 'req-1', requirementName: 'Requirement 1', pages: [1], confidence: 0.9 },
        { requirementId: 'req-2', requirementName: 'Requirement 2', pages: [2], confidence: 0.9 },
      ]),
    };

    mockPdfSplitterService = {
      splitByPages: jest.fn().mockResolvedValue([
        { label: 'Requirement 1', buffer: Buffer.from('req 1 pdf') },
        { label: 'Requirement 2', buffer: Buffer.from('req 2 pdf') },
      ]),
    };

    mockOcrQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    mockDocRepo = {
      create: jest.fn((dto) => ({ id: `doc-${Math.random()}`, ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchUploadProcessor,
        { provide: S3Service, useValue: mockS3Service },
        { provide: TextractService, useValue: mockTextractService },
        { provide: ClassificationService, useValue: mockClassificationService },
        { provide: PdfSplitterService, useValue: mockPdfSplitterService },
        { provide: getQueueToken(OCR_PROCESSING_QUEUE), useValue: mockOcrQueue },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocRepo },
      ],
    }).compile();

    processor = module.get<BatchUploadProcessor>(BatchUploadProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should split composite PDF into separate documents and enqueue each for OCR', async () => {
      const mockJob = {
        data: {
          transactionId: 'tx-100',
          serviceId: 'srv-1',
          userId: 'user-1',
          s3Key: 'composite.pdf',
          fileName: 'composite.pdf',
          fileSize: 10000,
          fileType: 'application/pdf',
        },
      } as unknown as Job;

      const result = await processor.process(mockJob);

      expect(result.success).toBe(true);
      expect(result.splitCount).toBe(2);
      expect(mockPdfSplitterService.splitByPages).toHaveBeenCalled();
      expect(mockS3Service.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockDocRepo.save).toHaveBeenCalledTimes(2);
      expect(mockOcrQueue.add).toHaveBeenCalledTimes(2);
    });
  });
});
