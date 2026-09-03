import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TextractClient,
  TextractClientConfig,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  AnalyzeDocumentCommand,
  Block,
  FeatureType,
} from '@aws-sdk/client-textract';

import {
  ITextractService,
  ExtractedBlock,
  ExtractionResult,
} from './textract.service.abstract.js';
import { normalizeS3Key } from './s3.service.js';

export type { ExtractedBlock, ExtractionResult };

@Injectable()
export class TextractService extends ITextractService {
  private readonly logger = new Logger(TextractService.name);
  private readonly textractClient: TextractClient;
  private readonly s3BucketName: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const region = this.configService.get<string>('aws.region') || 'ap-southeast-1';
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');

    const clientConfig: TextractClientConfig = {
      region,
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      };
    }

    this.textractClient = new TextractClient(clientConfig);
    this.s3BucketName =
      this.configService.get<string>('aws.s3.bucketName') ||
      process.env.AWS_S3_BUCKET ||
      'landtrax';
  }

  /**
   * Extract text from a single-page image buffer.
   * @param fileBuffer Buffer containing the image
   * @returns Extracted text, overall confidence, and blocks
   */
  async extractText(fileBuffer: Buffer): Promise<ExtractionResult> {
    this.logger.log('Extracting text from image buffer');
    try {
      const command = new DetectDocumentTextCommand({
        Document: { Bytes: fileBuffer },
      });
      const response = await this.textractClient.send(command);

      return this._mapBlocksToExtractionResult(response.Blocks || []);
    } catch (error) {
      this.logger.error('Error extracting text from buffer', error);
      throw error;
    }
  }

  /**
   * Extract text from a multi-page PDF stored in S3.
   * @param s3Key The S3 object key or S3 URL
   * @returns Extracted text, overall confidence, and blocks grouped by page
   */
  async extractTextFromS3(s3Key: string): Promise<ExtractionResult> {
    const cleanKey = normalizeS3Key(s3Key, this.s3BucketName);
    this.logger.log(`Starting text extraction for S3 key: ${cleanKey}`);
    try {
      const startCommand = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: this.s3BucketName,
            Name: cleanKey,
          },
        },
      });

      const startResponse = await this.textractClient.send(startCommand);
      const jobId = startResponse.JobId;

      if (!jobId) {
        throw new Error('No JobId returned from StartDocumentTextDetection');
      }

      await this._waitForTextDetection(jobId);

      const allBlocks: Block[] = [];
      let nextToken: string | undefined;

      do {
        const getCommand = new GetDocumentTextDetectionCommand({
          JobId: jobId,
          NextToken: nextToken,
        });

        const getResponse = await this.textractClient.send(getCommand);
        if (getResponse.Blocks) {
          allBlocks.push(...getResponse.Blocks);
        }
        nextToken = getResponse.NextToken;
      } while (nextToken);

      return this._mapBlocksToExtractionResult(allBlocks);
    } catch (error) {
      this.logger.error(`Error extracting text from S3 key: ${cleanKey}`, error);
      throw error;
    }
  }

  /**
   * Extract structured forms and tables from a document using Textract AnalyzeDocument.
   * @param fileBuffer Buffer containing the document (PDF page or Image)
   * @returns Raw extracted blocks for key-value extraction
   */
  async extractFormsAndTables(fileBuffer: Buffer): Promise<Block[]> {
    this.logger.log('Extracting forms and tables via AnalyzeDocument');
    try {
      const command = new AnalyzeDocumentCommand({
        Document: { Bytes: fileBuffer },
        FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
      });

      const response = await this.textractClient.send(command);
      return response.Blocks || [];
    } catch (error) {
      this.logger.error('Error analyzing forms and tables', error);
      throw error;
    }
  }

  /**
   * Alias implementing ITextractService.analyzeDocument.
   */
  async analyzeDocument(fileBuffer: Buffer): Promise<Block[]> {
    return this.extractFormsAndTables(fileBuffer);
  }

  /**
   * Poll Textract until asynchronous text detection job finishes.
   */
  private async _waitForTextDetection(jobId: string, maxAttempts = 60, intervalMs = 2000): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const command = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const response = await this.textractClient.send(command);

      const status = response.JobStatus;
      if (status === 'SUCCEEDED') {
        return;
      }

      if (status === 'FAILED') {
        throw new Error(`Textract job ${jobId} failed: ${response.StatusMessage}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Textract job ${jobId} timed out after ${maxAttempts * (intervalMs / 1000)}s`);
  }

  /**
   * Helper to process Textract blocks into a structured ExtractionResult.
   */
  private _mapBlocksToExtractionResult(blocks: Block[]): ExtractionResult {
    const extractedBlocks: ExtractedBlock[] = [];
    let fullText = '';
    let totalConfidence = 0;
    let lineCount = 0;

    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        fullText += (fullText ? '\n' : '') + block.Text;
        totalConfidence += block.Confidence || 0;
        lineCount++;

        extractedBlocks.push({
          text: block.Text,
          confidence: block.Confidence || 0,
          pageNumber: block.Page || 1,
          geometry: block.Geometry
            ? {
                boundingBox: block.Geometry.BoundingBox,
                polygon: block.Geometry.Polygon,
              }
            : undefined,
        });
      }
    }

    const overallConfidence = lineCount > 0 ? totalConfidence / lineCount : 0;

    return {
      text: fullText,
      confidence: overallConfidence,
      blocks: extractedBlocks,
    };
  }
}
