import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BedrockService } from 'src/shared/infrastructure/aws/bedrock.service.js';
import ExtractedFieldEntity from 'src/shared/infrastructure/database/entities/extracted-field.entity.js';
import RequirementMappingEntity from 'src/shared/infrastructure/database/entities/requirement-mapping.entity.js';
import { ExtractionService } from '../extraction.service.js';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let mockBedrockService: any;
  let mockExtractedFieldRepo: any;
  let mockReqMappingRepo: any;

  beforeEach(async () => {
    mockBedrockService = {
      extractFields: jest.fn(),
    };

    mockExtractedFieldRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entities) => Promise.resolve(entities)),
      find: jest.fn(),
      count: jest.fn(),
    };

    mockReqMappingRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        { provide: BedrockService, useValue: mockBedrockService },
        { provide: getRepositoryToken(ExtractedFieldEntity), useValue: mockExtractedFieldRepo },
        { provide: getRepositoryToken(RequirementMappingEntity), useValue: mockReqMappingRepo },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractFields', () => {
    it('should dynamically query target field names from RequirementMapping and call Bedrock (AC 10-18, 39)', async () => {
      mockReqMappingRepo.find.mockResolvedValueOnce([
        { targetFieldName: 'Title No.' },
        { targetFieldName: "Buyer's Name" },
        { targetFieldName: 'Unit No./PBL' },
        { targetFieldName: 'Notarized Date' },
      ]);

      mockBedrockService.extractFields.mockResolvedValueOnce([
        { fieldName: 'Title No.', value: 'T-98765', confidence: 0.99 },
        { fieldName: "Buyer's Name", value: 'Maria Santos', confidence: 0.95 },
        { fieldName: 'Unit No./PBL', value: null, confidence: 0 },
        { fieldName: 'Notarized Date', value: '2026-02-01', confidence: 0.92 },
      ]);

      const result = await service.extractFields(
        'DEED OF ABSOLUTE SALE text...',
        'req-deed-of-sale',
        'srv-title-transfer',
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ fieldName: 'Title No.', value: 'T-98765', confidence: 0.99 });
      expect(result[2]).toEqual({ fieldName: 'Unit No./PBL', value: null, confidence: 0 });

      expect(mockBedrockService.extractFields).toHaveBeenCalledWith(
        expect.any(String),
        ['Title No.', "Buyer's Name", 'Unit No./PBL', 'Notarized Date'],
      );
    });
  });

  describe('saveExtractedFields', () => {
    it('should create and save ExtractedFieldEntity records with blank entry for null values (AC 25)', async () => {
      const fields = [
        { fieldName: 'Title No.', value: 'T-12345', confidence: 0.95 },
        { fieldName: 'RD Location', value: null, confidence: 0 },
      ];

      const saved = await service.saveExtractedFields('doc-100', fields);

      expect(saved).toHaveLength(2);
      expect(saved[0].documentId).toBe('doc-100');
      expect(saved[0].fieldName).toBe('Title No.');
      expect(saved[0].fieldValue).toBe('T-12345');
      expect(saved[0].isUserModified).toBe(false);

      expect(saved[1].fieldName).toBe('RD Location');
      expect(saved[1].fieldValue).toBeNull();
      expect(saved[1].isUserModified).toBe(false);
    });
  });

  describe('checkUserModifiedFields', () => {
    it('should return true when user modified fields exist (AC 36-38)', async () => {
      mockExtractedFieldRepo.count.mockResolvedValueOnce(1);
      const hasModified = await service.checkUserModifiedFields('doc-100');
      expect(hasModified).toBe(true);
    });

    it('should return false when no user modified fields exist', async () => {
      mockExtractedFieldRepo.count.mockResolvedValueOnce(0);
      const hasModified = await service.checkUserModifiedFields('doc-100');
      expect(hasModified).toBe(false);
    });
  });

  describe('deleteFieldsByDocumentId', () => {
    it('should soft delete existing extracted fields (AC 8-9)', async () => {
      const mockFields = [
        { id: 'f-1', documentId: 'doc-100', deletedDate: null },
        { id: 'f-2', documentId: 'doc-100', deletedDate: null },
      ];
      mockExtractedFieldRepo.find.mockResolvedValueOnce(mockFields);

      await service.deleteFieldsByDocumentId('doc-100');

      expect(mockExtractedFieldRepo.save).toHaveBeenCalled();
      expect(mockFields[0].deletedDate).toBeInstanceOf(Date);
    });
  });
});
