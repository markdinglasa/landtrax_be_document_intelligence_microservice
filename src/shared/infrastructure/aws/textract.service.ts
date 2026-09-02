import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TextractClient,
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

export type { ExtractedBlock, ExtractionResult };

@Injectable()
export class TextractService extends ITextractService {
  private readonly logger = new Logger(TextractService.name);
  private readonly textractClient: TextractClient;
  private readonly s3BucketName: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.textractClient = new TextractClient({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey')!,
      },
    });
    this.s3BucketName = this.configService.get<string>('aws.s3.bucketName')!;
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
   * @param s3Key The S3 object key
   * @returns Extracted text, overall confidence, and blocks grouped by page
   */
  async extractTextFromS3(s3Key: string): Promise<ExtractionResult> {
    this.logger.log(`Starting text extraction for S3 key: ${s3Key}`);
    try {
      const startCommand = new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: this.s3BucketName,
            Name: s3Key,
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
      this.logger.error(`Error extracting text from S3 key: ${s3Key}`, error);
      throw error;
    }
  }

  /**
   * Analyze document for forms and tables from a buffer.
   * @param fileBuffer Buffer containing the image
   * @returns Raw Textract response blocks
   */
  async analyzeDocument(fileBuffer: Buffer): Promise<Block[]> {
    this.logger.log('Analyzing document from buffer for forms and tables');
    try {
      const command = new AnalyzeDocumentCommand({
        Document: { Bytes: fileBuffer },
        FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
      });
      const response = await this.textractClient.send(command);
      return response.Blocks || [];
    } catch (error) {
      this.logger.error('Error analyzing document', error);
      throw error;
    }
  }

  /**
   * Polls the Textract job status until SUCCEEDED or FAILED.
   * @param jobId The job ID to poll
   */
  private async _waitForTextDetection(jobId: string): Promise<void> {
    let status = 'IN_PROGRESS';
    while (status === 'IN_PROGRESS') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId });
      const getResponse = await this.textractClient.send(getCommand);
      status = getResponse.JobStatus || 'FAILED';

      if (status === 'FAILED') {
        throw new Error('Textract job failed');
      }
    }
  }

  /**
   * Helper to map raw Blocks to ExtractionResult
   */
  private _mapBlocksToExtractionResult(blocks: Block[]): ExtractionResult {
    let fullText = '';
    let totalConfidence = 0;
    let blockCount = 0;
    const extractedBlocks: ExtractedBlock[] = [];

    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        fullText += (fullText ? '\n' : '') + block.Text;
        totalConfidence += block.Confidence || 0;
        blockCount++;
        extractedBlocks.push({
          text: block.Text,
          confidence: block.Confidence || 0,
          pageNumber: block.Page || 1,
        });
      }
    }

    return {
      text: fullText,
      confidence: blockCount > 0 ? totalConfidence / blockCount : 0,
      blocks: extractedBlocks,
    };
  }
}
