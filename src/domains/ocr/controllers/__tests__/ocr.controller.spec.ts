import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from '../ocr.controller.js';
import { OcrService } from '../../services/ocr.service.js';

describe('OcrController', () => {
  let controller: OcrController;
  let mockOcrService: any;

  beforeEach(async () => {
    mockOcrService = {
      processBatch: jest.fn().mockResolvedValue({ success: true, results: [] }),
      processReplacement: jest.fn().mockResolvedValue({ success: true, message: 'queued' }),
      processCompositeBatch: jest.fn().mockResolvedValue({ success: true, message: 'queued' }),
      getStatus: jest.fn().mockResolvedValue([]),
      updateField: jest.fn().mockResolvedValue({ success: true }),
      getFields: jest.fn().mockResolvedValue([]),
      removeDocumentOcr: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [{ provide: OcrService, useValue: mockOcrService }],
    }).compile();

    controller = module.get<OcrController>(OcrController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('processBatch', () => {
    it('should delegate to ocrService.processBatch', async () => {
      const dto: any = { transactionId: 'tx-1', userId: 'u-1', documents: [] };
      await controller.processBatch(dto);
      expect(mockOcrService.processBatch).toHaveBeenCalledWith(dto);
    });
  });

  describe('processReplacement', () => {
    it('should delegate to ocrService.processReplacement', async () => {
      const dto: any = { documentId: 'doc-1', requirementId: 'req-1' };
      await controller.processReplacement(dto);
      expect(mockOcrService.processReplacement).toHaveBeenCalledWith(dto);
    });
  });

  describe('processCompositeBatch', () => {
    it('should delegate to ocrService.processCompositeBatch', async () => {
      const dto: any = { transactionId: 'tx-1', s3Key: 'key.pdf' };
      await controller.processCompositeBatch(dto);
      expect(mockOcrService.processCompositeBatch).toHaveBeenCalledWith(dto);
    });
  });

  describe('getStatus', () => {
    it('should delegate to ocrService.getStatus', async () => {
      await controller.getStatus({ documentIds: ['d1', 'd2'] });
      expect(mockOcrService.getStatus).toHaveBeenCalledWith(['d1', 'd2']);
    });
  });

  describe('updateField', () => {
    it('should delegate to ocrService.updateField', async () => {
      const dto: any = { documentId: 'd1', fieldName: 'Title No.', value: '123', userId: 'u1' };
      await controller.updateField(dto);
      expect(mockOcrService.updateField).toHaveBeenCalledWith(dto);
    });
  });

  describe('getFields', () => {
    it('should delegate to ocrService.getFields', async () => {
      await controller.getFields({ documentId: 'd1' });
      expect(mockOcrService.getFields).toHaveBeenCalledWith('d1');
    });
  });

  describe('removeDocumentOcr', () => {
    it('should delegate to ocrService.removeDocumentOcr and return success', async () => {
      const result = await controller.removeDocumentOcr({ documentId: 'd1' });
      expect(mockOcrService.removeDocumentOcr).toHaveBeenCalledWith('d1');
      expect(result.success).toBe(true);
    });
  });
});
