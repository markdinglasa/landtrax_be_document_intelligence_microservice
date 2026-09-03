import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IS3Service } from './s3.service.abstract.js';

/**
 * Normalizes an S3 key or full S3 URL into a clean relative S3 object key.
 * Examples:
 * - "https://landtrax.s3.ap-southeast-1.amazonaws.com/transactions/123/file.pdf" -> "transactions/123/file.pdf"
 * - "https://s3.ap-southeast-1.amazonaws.com/landtrax/transactions/123/file.pdf" -> "transactions/123/file.pdf"
 * - "transactions/123/file.pdf" -> "transactions/123/file.pdf"
 */
export function normalizeS3Key(key: string, bucketName?: string): string {
  if (!key) return '';

  const trimmed = key.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      let pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

      // If URL path starts with bucketName (path-style URL e.g. s3.amazonaws.com/bucket/key)
      if (bucketName && pathname.startsWith(`${bucketName}/`)) {
        pathname = pathname.substring(bucketName.length + 1);
      }

      return pathname;
    } catch {
      // Fallback: strip leading slash if URL parsing fails
      return trimmed.replace(/^\/+/, '');
    }
  }

  return trimmed.replace(/^\/+/, '');
}

@Injectable()
export class S3Service extends IS3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const region = this.configService.get<string>('aws.region') || 'ap-southeast-1';
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

    const clientConfig: S3ClientConfig = {
      region,
    };

    // Only supply explicit credentials if non-empty strings are provided
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      };
    }

    this.s3Client = new S3Client(clientConfig);
    this.bucketName =
      this.configService.get<string>('aws.s3.bucketName') ||
      process.env.AWS_S3_BUCKET ||
      'landtrax';
  }

  /** Upload a file buffer to S3. */
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    const cleanKey = normalizeS3Key(key, this.bucketName);
    this.logger.log(`Uploading file to S3: ${cleanKey}`);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: body,
        ContentType: contentType,
      }),
    );
    return cleanKey;
  }

  /** Download a file from S3 as a Buffer. */
  async downloadFile(key: string): Promise<Buffer> {
    const cleanKey = normalizeS3Key(key, this.bucketName);
    this.logger.log(`Downloading file from S3: ${cleanKey} (raw key was: ${key})`);
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
      }),
    );
    const stream = response.Body;
    if (!stream) {
      throw new Error(`Empty response body for S3 key: ${cleanKey}`);
    }
    // Convert readable stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /** Generate a pre-signed URL for uploading. */
  async getUploadSignedUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const cleanKey = normalizeS3Key(key, this.bucketName);
    this.logger.log(`Generating upload signed URL for: ${cleanKey}`);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: cleanKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /** Generate a pre-signed URL for downloading. */
  async getDownloadSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const cleanKey = normalizeS3Key(key, this.bucketName);
    this.logger.log(`Generating download signed URL for: ${cleanKey}`);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: cleanKey,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /** Delete a file from S3. */
  async deleteFile(key: string): Promise<void> {
    const cleanKey = normalizeS3Key(key, this.bucketName);
    this.logger.log(`Deleting file from S3: ${cleanKey}`);
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
      }),
    );
  }
}
