import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OCRFailureReason } from '../../../../shared/common/ocr-enums.js';
import DocumentEntity from '../../../../shared/infrastructure/database/entities/document.entity.js';
import RequirementEntity from '../../../../shared/infrastructure/database/entities/requirement.entity.js';
import RequirementMappingEntity from '../../../../shared/infrastructure/database/entities/requirement-mapping.entity.js';
import { ValidationService } from '../validation.service.js';

describe('ValidationService', () => {
  let service: ValidationService;
  let mockDocRepo: any;
  let mockReqRepo: any;
  let mockReqMapRepo: any;

  beforeEach(async () => {
    mockDocRepo = {
      findOne: jest.fn(),
    };

    mockReqRepo = {
      findOne: jest.fn(),
    };

    mockReqMapRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocRepo },
        { provide: getRepositoryToken(RequirementEntity), useValue: mockReqRepo },
        { provide: getRepositoryToken(RequirementMappingEntity), useValue: mockReqMapRepo },
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
    it('should return isDuplicate=true with exact message when duplicate file exists (AC 30-32)', async () => {
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

    it('should return isDuplicate=true when requirement is already processed in transaction', async () => {
      mockDocRepo.findOne
        .mockResolvedValueOnce(null) // no file duplicate
        .mockResolvedValueOnce({ id: 'doc-existing', requirementId: 'req-1', transactionId: 'tx-123' }); // requirement duplicate

      mockReqRepo.findOne.mockResolvedValueOnce({ id: 'req-1', name: 'Transfer Certificate of Title' });

      const result = await service.checkDuplicate('new-title.pdf', 2048, 'tx-123', 'req-1');

      expect(result.isDuplicate).toBe(true);
      expect(result.message).toBe("The requirement 'Transfer Certificate of Title' has already been processed for this transaction.");
    });

    it('should return isDuplicate=true when mapped requirement is already processed in transaction', async () => {
      mockDocRepo.findOne
        .mockResolvedValueOnce(null) // no file duplicate
        .mockResolvedValueOnce(null) // no direct requirement duplicate
        .mockResolvedValueOnce({ id: 'doc-mapped', requirementId: 'req-target', transactionId: 'tx-123' }); // mapped requirement duplicate

      mockReqMapRepo.findOne.mockResolvedValueOnce({
        sourceRequirementId: 'req-source',
        targetRequirementId: 'req-target',
        serviceId: 'srv-1',
      });

      mockReqRepo.findOne.mockResolvedValueOnce({ id: 'req-source', name: 'Deed of Absolute Sale' });

      const result = await service.checkDuplicate('deed.pdf', 2048, 'tx-123', 'req-source', 'srv-1');

      expect(result.isDuplicate).toBe(true);
      expect(result.message).toBe("The requirement 'Deed of Absolute Sale' has already been processed for this transaction.");
    });

    it('should return isDuplicate=false when file and requirement are not duplicates', async () => {
      mockDocRepo.findOne.mockResolvedValue(null);
      mockReqMapRepo.findOne.mockResolvedValue(null);

      const result = await service.checkDuplicate('new-doc.pdf', 2048, 'tx-123', 'req-1', 'srv-1');

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

    it('should detect unsupported file formats like .zip, .rar, .docx as UNSUPPORTED_CONTENT (AC 3)', () => {
      const zipBuffer = Buffer.from('PK\x03\x04 fake zip content');
      const zipResult = service.detectUnreadableConditions(zipBuffer, 'archive.zip');

      expect(zipResult.isReadable).toBe(false);
      expect(zipResult.failureReason).toBe(OCRFailureReason.UNSUPPORTED_CONTENT);

      const docxResult = service.detectUnreadableConditions(zipBuffer, 'document.docx');
      expect(docxResult.isReadable).toBe(false);
      expect(docxResult.failureReason).toBe(OCRFailureReason.UNSUPPORTED_CONTENT);
    });

    it('should pass normal image buffer as readable', () => {
      const imgBuffer = Buffer.from('fake png image data');
      const result = service.detectUnreadableConditions(imgBuffer, 'receipt.png');

      expect(result.isReadable).toBe(true);
      expect(result.failureReason).toBeUndefined();
    });

    it('should pass normal PDF buffer as readable', () => {
      const normalPdfBuffer = Buffer.from('%PDF-1.4 ... normal text content ...');
      const result = service.detectUnreadableConditions(normalPdfBuffer, 'normal.pdf');

      expect(result.isReadable).toBe(true);
      expect(result.failureReason).toBeUndefined();
    });
  });
});
