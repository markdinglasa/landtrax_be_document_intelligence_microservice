import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IS3Service } from './s3.service.abstract.js';

@Injectable()
export class S3Service extends IS3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.s3Client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
    });
    this.bucketName = this.configService.get<string>('aws.s3.bucketName')!;
  }

  /** Upload a file buffer to S3. */
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    this.logger.log(`Uploading file to S3: ${key}`);
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  /** Download a file from S3 as a Buffer. */
  async downloadFile(key: string): Promise<Buffer> {
    this.logger.log(`Downloading file from S3: ${key}`);
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
    const stream = response.Body;
    if (!stream) {
      throw new Error(`Empty response body for S3 key: ${key}`);
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
    this.logger.log(`Generating upload signed URL for: ${key}`);
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /** Generate a pre-signed URL for downloading. */
  async getDownloadSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.logger.log(`Generating download signed URL for: ${key}`);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /** Delete a file from S3. */
  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting file from S3: ${key}`);
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }
}
