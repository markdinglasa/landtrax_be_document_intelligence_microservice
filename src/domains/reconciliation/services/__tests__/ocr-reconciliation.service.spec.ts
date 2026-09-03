import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OCR_BATCH_QUEUE, OCR_PROCESSING_QUEUE } from '../../../../shared/common/ocr-enums.js';
import DocumentEntity from '../../../../shared/infrastructure/database/entities/document.entity.js';
import TransactionServiceEntity from '../../../../shared/infrastructure/database/entities/transaction-service.entity.js';
import { OcrReconciliationService } from '../ocr-reconciliation.service.js';

describe('OcrReconciliationService', () => {
  let service: OcrReconciliationService;
  let mockBatchQueue: any;
  let mockProcessingQueue: any;
  let mockDocumentRepo: any;
  let mockTransactionServiceRepo: any;

  beforeEach(async () => {
    mockBatchQueue = {
      add: jest.fn().mockResolvedValue({ id: 'batch-reconcile-job' }),
    };

    mockProcessingQueue = {
      add: jest.fn().mockResolvedValue({ id: 'processing-reconcile-job' }),
    };

    mockDocumentRepo = {
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTransactionServiceRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'tx-srv-1', serviceId: 'srv-100' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrReconciliationService,
        { provide: getQueueToken(OCR_BATCH_QUEUE), useValue: mockBatchQueue },
        { provide: getQueueToken(OCR_PROCESSING_QUEUE), useValue: mockProcessingQueue },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocumentRepo },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: mockTransactionServiceRepo },
      ],
    }).compile();

    service = module.get<OcrReconciliationService>(OcrReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcilePendingDocuments', () => {
    it('should return 0 counts when no stuck documents exist', async () => {
      mockDocumentRepo.find.mockResolvedValueOnce([]);

      const result = await service.reconcilePendingDocuments(15, 50);

      expect(result).toEqual({
        scanned: 0,
        enqueuedBatch: 0,
        enqueuedSingle: 0,
        skipped: 0,
      });
      expect(mockBatchQueue.add).not.toHaveBeenCalled();
      expect(mockProcessingQueue.add).not.toHaveBeenCalled();
    });

    it('should route COMPOSITE stuck documents to batch queue and update notes', async () => {
      const stuckCompositeDoc = {
        id: 'doc-comp-1',
        transactionId: 'tx-1',
        transactionServiceId: 'tx-srv-1',
        category: 'COMPOSITE',
        userId: 'user-1',
        fileURL: 'transactions/tx-1/doc.pdf',
        originalFileName: 'composite.pdf',
        fileSize: 5000,
        type: 'application/pdf',
        notes: 'OCR - Processing',
      };

      mockDocumentRepo.find.mockResolvedValueOnce([stuckCompositeDoc]);

      const result = await service.reconcilePendingDocuments(15, 50);

      expect(result.scanned).toBe(1);
      expect(result.enqueuedBatch).toBe(1);
      expect(result.enqueuedSingle).toBe(0);
      expect(mockBatchQueue.add).toHaveBeenCalledTimes(1);
      expect(mockDocumentRepo.update).toHaveBeenCalledWith('doc-comp-1', {
        notes: expect.stringContaining('Reconciliation Attempt 1'),
      });
    });

    it('should route REQUIREMENT stuck documents to processing queue', async () => {
      const stuckReqDoc = {
        id: 'doc-req-1',
        transactionId: 'tx-1',
        transactionServiceId: 'tx-srv-1',
        category: 'REQUIREMENT',
        requirementId: 'req-99',
        userId: 'user-1',
        fileURL: 'transactions/tx-1/req.pdf',
        originalFileName: 'req.pdf',
        fileSize: 2000,
        type: 'application/pdf',
        notes: null,
      };

      mockDocumentRepo.find.mockResolvedValueOnce([stuckReqDoc]);

      const result = await service.reconcilePendingDocuments(15, 50);

      expect(result.scanned).toBe(1);
      expect(result.enqueuedBatch).toBe(0);
      expect(result.enqueuedSingle).toBe(1);
      expect(mockProcessingQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should skip and mark permanently failed when retry count reaches max (3)', async () => {
      const maxRetriedDoc = {
        id: 'doc-fail-1',
        transactionId: 'tx-1',
        category: 'COMPOSITE',
        userId: 'user-1',
        fileURL: 'transactions/tx-1/corrupted.pdf',
        notes: 'OCR - Reconciled (Reconciliation Attempt 3)',
      };

      mockDocumentRepo.find.mockResolvedValueOnce([maxRetriedDoc]);

      const result = await service.reconcilePendingDocuments(15, 50);

      expect(result.skipped).toBe(1);
      expect(result.enqueuedBatch).toBe(0);
      expect(mockBatchQueue.add).not.toHaveBeenCalled();
      expect(mockDocumentRepo.update).toHaveBeenCalledWith(
        'doc-fail-1',
        expect.objectContaining({
          ocrProcessed: true,
          notes: 'OCR - Failed (Max retries exceeded)',
        }),
      );
    });
  });

  describe('handleCron', () => {
    it('should execute cron run and return result', async () => {
      mockDocumentRepo.find.mockResolvedValueOnce([]);

      const result = await service.handleCron();

      expect(result).toEqual({
        scanned: 0,
        enqueuedBatch: 0,
        enqueuedSingle: 0,
        skipped: 0,
      });
    });
  });
});
