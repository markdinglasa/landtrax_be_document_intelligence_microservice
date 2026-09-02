import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OCRFailureReason } from '../../../../shared/common/ocr-enums.js';
import DocumentEntity from '../../../../shared/infrastructure/database/entities/document.entity.js';
import RequirementEntity from '../../../../shared/infrastructure/database/entities/requirement.entity.js';
import { ValidationService } from '../validation.service.js';

describe('ValidationService', () => {
  let service: ValidationService;
  let mockDocRepo: any;
  let mockReqRepo: any;

  beforeEach(async () => {
    mockDocRepo = {
      findOne: jest.fn(),
    };

    mockReqRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocRepo },
        { provide: getRepositoryToken(RequirementEntity), useValue: mockReqRepo },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDuplicate', () => {
    it('should return isDuplicate=true with exact message when duplicate exists (AC 30-32)', async () => {
      mockDocRepo.findOne.mockResolvedValueOnce({
        id: 'doc-1',
        originalFileName: 'title.pdf',
        fileSize: 1024,
        transactionId: 'tx-123',
      });

      const result = await service.checkDuplicate('title.pdf', 1024, 'tx-123');

      expect(result.isDuplicate).toBe(true);
      expect(result.message).toBe('The selected file has already been uploaded for this transaction.');
    });

    it('should return isDuplicate=false when file is not duplicate', async () => {
      mockDocRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.checkDuplicate('new-doc.pdf', 2048, 'tx-123');

      expect(result.isDuplicate).toBe(false);
      expect(result.message).toBeUndefined();
    });
  });

  describe('validateFile', () => {
    it('should return valid=true when file complies with requirement settings', async () => {
      mockReqRepo.findOne.mockResolvedValueOnce({
        id: 'req-1',
        maxFileSize: 5000000,
        acceptedFileTypes: 'pdf,jpg,png',
      });

      const result = await service.validateFile('deed.pdf', 1024, 'application/pdf', 'req-1');
      expect(result.valid).toBe(true);
    });

    it('should reject file when size exceeds maxFileSize', async () => {
      mockReqRepo.findOne.mockResolvedValueOnce({
        id: 'req-1',
        maxFileSize: 1000,
        acceptedFileTypes: 'pdf,jpg,png',
      });

      const result = await service.validateFile('large.pdf', 5000, 'application/pdf', 'req-1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('exceeds the maximum allowed size');
    });

    it('should reject file when extension is not accepted', async () => {
      mockReqRepo.findOne.mockResolvedValueOnce({
        id: 'req-1',
        maxFileSize: 5000000,
        acceptedFileTypes: 'pdf,jpg',
      });

      const result = await service.validateFile('file.exe', 1024, 'application/octet-stream', 'req-1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('File type not accepted');
    });
  });

  describe('detectUnreadableConditions', () => {
    it('should detect blank buffer as BLANK_DOCUMENT (AC 3)', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = service.detectUnreadableConditions(emptyBuffer, 'test.pdf');

      expect(result.isReadable).toBe(false);
      expect(result.failureReason).toBe(OCRFailureReason.BLANK_DOCUMENT);
    });

    it('should detect encrypted/password-protected PDF (AC 3)', () => {
      const encryptedPdfBuffer = Buffer.from('%PDF-1.4 ... /Encrypt 5 0 R ...');
      const result = service.detectUnreadableConditions(encryptedPdfBuffer, 'secure.pdf');

      expect(result.isReadable).toBe(false);
      expect(result.failureReason).toBe(OCRFailureReason.PASSWORD_PROTECTED);
    });

    it('should pass normal PDF buffer as readable', () => {
      const normalPdfBuffer = Buffer.from('%PDF-1.4 ... normal text content ...');
      const result = service.detectUnreadableConditions(normalPdfBuffer, 'normal.pdf');

      expect(result.isReadable).toBe(true);
      expect(result.failureReason).toBeUndefined();
    });
  });
});
