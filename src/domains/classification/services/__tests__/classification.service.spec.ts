import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BedrockService } from '../../../../shared/infrastructure/aws/bedrock.service.js';
import RequirementMappingEntity from '../../../../shared/infrastructure/database/entities/requirement-mapping.entity.js';
import RequirementEntity from '../../../../shared/infrastructure/database/entities/requirement.entity.js';
import { ClassificationService } from '../classification.service.js';

describe('ClassificationService', () => {
  let service: ClassificationService;
  let mockBedrockService: any;
  let mockReqMappingRepo: any;
  let mockReqRepo: any;

  beforeEach(async () => {
    mockBedrockService = {
      classifyDocument: jest.fn(),
    };

    mockReqMappingRepo = {
      find: jest.fn(),
    };

    mockReqRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassificationService,
        { provide: BedrockService, useValue: mockBedrockService },
        { provide: getRepositoryToken(RequirementMappingEntity), useValue: mockReqMappingRepo },
        { provide: getRepositoryToken(RequirementEntity), useValue: mockReqRepo },
      ],
    }).compile();

    service = module.get<ClassificationService>(ClassificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyDocument', () => {
    it('should dynamically fetch mappings and classify text using Bedrock (AC 4, 39)', async () => {
      mockReqMappingRepo.find.mockResolvedValueOnce([
        { sourceRequirementId: 'req-1', serviceId: 'srv-title-transfer' },
        { sourceRequirementId: 'req-2', serviceId: 'srv-title-transfer' },
      ]);

      mockReqRepo.findOne
        .mockResolvedValueOnce({ id: 'req-1', name: 'Deed of Absolute Sale' })
        .mockResolvedValueOnce({ id: 'req-2', name: 'Transfer Certificate of Title' });

      mockBedrockService.classifyDocument.mockResolvedValueOnce({
        requirementName: 'Deed of Absolute Sale',
        confidence: 0.96,
      });

      const result = await service.classifyDocument(
        'KNOW ALL MEN BY THESE PRESENTS: Deed of Absolute Sale...',
        'srv-title-transfer',
      );

      expect(result).toEqual({
        requirementId: 'req-1',
        requirementName: 'Deed of Absolute Sale',
        confidence: 0.96,
      });

      expect(mockBedrockService.classifyDocument).toHaveBeenCalledWith(
        expect.any(String),
        ['Deed of Absolute Sale', 'Transfer Certificate of Title'],
      );
    });

    it('should return null when no mappings found for the service', async () => {
      mockReqMappingRepo.find.mockResolvedValueOnce([]);

      const result = await service.classifyDocument('Some text', 'srv-unknown');
      expect(result).toBeNull();
    });
  });

  describe('classifyMultiPageDocument', () => {
    it('should group consecutive pages with the same classification', async () => {
      mockReqMappingRepo.find.mockResolvedValue([
        { sourceRequirementId: 'req-1', serviceId: 'srv-1' },
        { sourceRequirementId: 'req-2', serviceId: 'srv-1' },
      ]);

      mockReqRepo.findOne
        .mockResolvedValueOnce({ id: 'req-1', name: 'Requirement 1' })
        .mockResolvedValueOnce({ id: 'req-2', name: 'Requirement 2' })
        .mockResolvedValueOnce({ id: 'req-1', name: 'Requirement 1' })
        .mockResolvedValueOnce({ id: 'req-2', name: 'Requirement 2' })
        .mockResolvedValueOnce({ id: 'req-1', name: 'Requirement 1' })
        .mockResolvedValueOnce({ id: 'req-2', name: 'Requirement 2' });

      mockBedrockService.classifyDocument
        .mockResolvedValueOnce({ requirementName: 'Requirement 1', confidence: 0.9 })
        .mockResolvedValueOnce({ requirementName: 'Requirement 1', confidence: 0.95 })
        .mockResolvedValueOnce({ requirementName: 'Requirement 2', confidence: 0.85 });

      const pageTexts = [
        { pageNumber: 1, text: 'Page 1 of Req 1' },
        { pageNumber: 2, text: 'Page 2 of Req 1' },
        { pageNumber: 3, text: 'Page 3 of Req 2' },
      ];

      const groups = await service.classifyMultiPageDocument(pageTexts, 'srv-1');

      expect(groups).toHaveLength(2);
      expect(groups[0].requirementName).toBe('Requirement 1');
      expect(groups[0].pages).toEqual([1, 2]);
      expect(groups[1].requirementName).toBe('Requirement 2');
      expect(groups[1].pages).toEqual([3]);
    });
  });
});
