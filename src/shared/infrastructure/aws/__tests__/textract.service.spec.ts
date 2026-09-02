import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { TextractService } from '../textract.service.js';

jest.mock('@aws-sdk/client-textract');

describe('TextractService', () => {
  let service: TextractService;
  let mockTextractClientSend: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'aws.region': 'ap-southeast-1',
        'aws.accessKeyId': 'test-key',
        'aws.secretAccessKey': 'test-secret',
        'aws.s3.bucketName': 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockTextractClientSend = jest.fn();
    (TextractClient as jest.Mock).mockImplementation(() => ({
      send: mockTextractClientSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TextractService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TextractService>(TextractService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractText', () => {
    it('should extract text and confidence from buffer', async () => {
      mockTextractClientSend.mockResolvedValueOnce({
        Blocks: [
          { BlockType: 'LINE', Text: 'TRANSFER CERTIFICATE OF TITLE', Confidence: 99.5, Page: 1 },
          { BlockType: 'LINE', Text: 'No. 123456', Confidence: 98.0, Page: 1 },
          { BlockType: 'WORD', Text: 'TRANSFER', Confidence: 99.5, Page: 1 },
        ],
      });

      const buffer = Buffer.from('test image');
      const result = await service.extractText(buffer);

      expect(result.text).toBe('TRANSFER CERTIFICATE OF TITLE\nNo. 123456');
      expect(result.confidence).toBeCloseTo(98.75, 1);
      expect(result.blocks).toHaveLength(2);
      expect(mockTextractClientSend).toHaveBeenCalledWith(expect.any(DetectDocumentTextCommand));
    });

    it('should handle empty blocks', async () => {
      mockTextractClientSend.mockResolvedValueOnce({ Blocks: [] });

      const buffer = Buffer.from('empty');
      const result = await service.extractText(buffer);

      expect(result.text).toBe('');
      expect(result.confidence).toBe(0);
      expect(result.blocks).toHaveLength(0);
    });
  });

  describe('extractTextFromS3', () => {
    it('should start and poll text detection job from S3', async () => {
      // 1. StartDocumentTextDetectionCommand response
      mockTextractClientSend.mockResolvedValueOnce({
        JobId: 'job-12345',
      });

      // 2. _waitForTextDetection poll response
      mockTextractClientSend.mockResolvedValueOnce({
        JobStatus: 'SUCCEEDED',
      });

      // 3. GetDocumentTextDetectionCommand response
      mockTextractClientSend.mockResolvedValueOnce({
        Blocks: [
          { BlockType: 'LINE', Text: 'DEED OF SALE', Confidence: 99.0, Page: 1 },
        ],
        NextToken: undefined,
      });

      const result = await service.extractTextFromS3('docs/test.pdf');

      expect(result.text).toBe('DEED OF SALE');
      expect(result.confidence).toBe(99.0);
    });

    it('should throw error when JobId is missing', async () => {
      mockTextractClientSend.mockResolvedValueOnce({});

      await expect(service.extractTextFromS3('docs/test.pdf')).rejects.toThrow(
        'No JobId returned from StartDocumentTextDetection',
      );
    });
  });

  describe('analyzeDocument', () => {
    it('should analyze document for forms and tables', async () => {
      const mockBlocks = [
        { BlockType: 'PAGE', Id: '1' },
        { BlockType: 'KEY_VALUE_SET', Id: '2' },
      ];
      mockTextractClientSend.mockResolvedValueOnce({ Blocks: mockBlocks });

      const buffer = Buffer.from('test');
      const blocks = await service.analyzeDocument(buffer);

      expect(blocks).toEqual(mockBlocks);
      expect(mockTextractClientSend).toHaveBeenCalledWith(expect.any(AnalyzeDocumentCommand));
    });
  });
});
