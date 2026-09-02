import { Block } from '@aws-sdk/client-textract';

export interface ExtractedBlock {
  text: string;
  confidence: number;
  pageNumber: number;
}

export interface ExtractionResult {
  text: string;
  confidence: number;
  blocks: ExtractedBlock[];
}

export abstract class ITextractService {
  /** Extract text from a single-page image buffer. */
  abstract extractText(fileBuffer: Buffer): Promise<ExtractionResult>;

  /** Extract text from a multi-page PDF stored in S3. */
  abstract extractTextFromS3(s3Key: string): Promise<ExtractionResult>;

  /** Analyze document for forms and tables from a buffer. */
  abstract analyzeDocument(fileBuffer: Buffer): Promise<Block[]>;
}
