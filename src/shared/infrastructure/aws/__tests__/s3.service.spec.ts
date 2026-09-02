import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3Service } from '../s3.service.js';

// Mock @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/test-signed-url'),
}));

describe('S3Service', () => {
  let service: S3Service;
  let mockS3ClientSend: jest.Mock;

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
    mockS3ClientSend = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockS3ClientSend,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload a buffer to S3 and return the key', async () => {
      mockS3ClientSend.mockResolvedValueOnce({});
      const buffer = Buffer.from('test content');
      const key = 'test/path/file.pdf';

      const result = await service.uploadFile(key, buffer, 'application/pdf');

      expect(result).toBe(key);
      expect(mockS3ClientSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });
  });

  describe('downloadFile', () => {
    it('should download a file from S3 and return a Buffer', async () => {
      const chunk1 = new Uint8Array(Buffer.from('hello '));
      const chunk2 = new Uint8Array(Buffer.from('world'));

      const asyncIterable = {
        async *[Symbol.asyncIterator]() {
          yield chunk1;
          yield chunk2;
        },
      };

      mockS3ClientSend.mockResolvedValueOnce({
        Body: asyncIterable,
      });

      const buffer = await service.downloadFile('test/path/file.pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString('utf8')).toBe('hello world');
      expect(mockS3ClientSend).toHaveBeenCalledWith(expect.any(GetObjectCommand));
    });

    it('should throw error if response body is empty', async () => {
      mockS3ClientSend.mockResolvedValueOnce({ Body: null });

      await expect(service.downloadFile('test/empty.pdf')).rejects.toThrow(
        'Empty response body for S3 key: test/empty.pdf',
      );
    });
  });

  describe('getUploadSignedUrl', () => {
    it('should return a presigned upload URL', async () => {
      const url = await service.getUploadSignedUrl('test/upload.pdf', 'application/pdf');
      expect(url).toBe('https://s3.amazonaws.com/test-signed-url');
    });
  });

  describe('getDownloadSignedUrl', () => {
    it('should return a presigned download URL', async () => {
      const url = await service.getDownloadSignedUrl('test/download.pdf');
      expect(url).toBe('https://s3.amazonaws.com/test-signed-url');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file from S3', async () => {
      mockS3ClientSend.mockResolvedValueOnce({});

      await service.deleteFile('test/delete.pdf');
      expect(mockS3ClientSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });
});
