import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockService } from '../bedrock.service.js';

jest.mock('@aws-sdk/client-bedrock-runtime');

describe('BedrockService', () => {
  let service: BedrockService;
  let mockBedrockClientSend: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'aws.region': 'ap-southeast-1',
        'aws.accessKeyId': 'test-key',
        'aws.secretAccessKey': 'test-secret',
        'aws.bedrock.modelId': 'anthropic.claude-3-sonnet-20240229-v1:0',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockBedrockClientSend = jest.fn();
    (BedrockRuntimeClient as jest.Mock).mockImplementation(() => ({
      send: mockBedrockClientSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedrockService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BedrockService>(BedrockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyDocument', () => {
    it('should classify document text into a category', async () => {
      const claudeResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              requirementName: 'Deed of Absolute Sale',
              confidence: 0.95,
            }),
          },
        ],
      };

      const responseUint8 = new TextEncoder().encode(JSON.stringify(claudeResponse));
      mockBedrockClientSend.mockResolvedValueOnce({
        body: responseUint8,
      });

      const result = await service.classifyDocument('KNOW ALL MEN BY THESE PRESENTS: This DEED OF ABSOLUTE SALE...', [
        'Deed of Absolute Sale',
        'Transfer Certificate of Title',
        'Tax Declaration',
      ]);

      expect(result).toEqual({
        requirementName: 'Deed of Absolute Sale',
        confidence: 0.95,
      });
      expect(mockBedrockClientSend).toHaveBeenCalledWith(expect.any(InvokeModelCommand));
    });

    it('should handle markdown wrapped JSON responses', async () => {
      const claudeResponse = {
        content: [
          {
            type: 'text',
            text: '```json\n{"requirementName": "Tax Declaration", "confidence": 0.88}\n```',
          },
        ],
      };

      const responseUint8 = new TextEncoder().encode(JSON.stringify(claudeResponse));
      mockBedrockClientSend.mockResolvedValueOnce({
        body: responseUint8,
      });

      const result = await service.classifyDocument('TAX DECLARATION OF REAL PROPERTY', [
        'Deed of Absolute Sale',
        'Tax Declaration',
      ]);

      expect(result).toEqual({
        requirementName: 'Tax Declaration',
        confidence: 0.88,
      });
    });
  });

  describe('extractFields', () => {
    it('should extract specific fields from document text', async () => {
      const claudeResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              fields: [
                { fieldName: 'Title No.', value: 'T-123456', confidence: 0.98 },
                { fieldName: "Buyer's Name", value: 'Juan Dela Cruz', confidence: 0.95 },
                { fieldName: 'Notarized Date', value: '2026-01-15', confidence: 0.9 },
                { fieldName: 'Unit No.', value: null, confidence: 0 },
              ],
            }),
          },
        ],
      };

      const responseUint8 = new TextEncoder().encode(JSON.stringify(claudeResponse));
      mockBedrockClientSend.mockResolvedValueOnce({
        body: responseUint8,
      });

      const result = await service.extractFields('DEED OF SALE... Title No. T-123456... Buyer: Juan Dela Cruz...', [
        'Title No.',
        "Buyer's Name",
        'Notarized Date',
        'Unit No.',
      ]);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ fieldName: 'Title No.', value: 'T-123456', confidence: 0.98 });
      expect(result[3]).toEqual({ fieldName: 'Unit No.', value: null, confidence: 0 });
    });
  });
});
