import { OCRStatus } from '../../../shared/common/ocr-enums.js';
import ExtractedFieldEntity from '../../../shared/infrastructure/database/entities/extracted-field.entity.js';
import { ProcessBatchDto } from '../dtos/process-batch.dto.js';
import { ProcessCompositeBatchDto } from '../dtos/process-composite.dto.js';
import { ProcessReplacementDto } from '../dtos/process-replacement.dto.js';
import { UpdateFieldDto } from '../dtos/update-field.dto.js';

export interface BatchProcessingResult {
  success: boolean;
  results: {
    documentId: string;
    fileName: string;
    status: 'QUEUED' | 'REJECTED';
    message?: string;
  }[];
}

export interface DocumentStatusResult {
  documentId: string;
  status: OCRStatus;
  confidence: number;
  failedReason: string | null;
  processedDate: Date | null;
}

export abstract class IOcrService {
  /** Process a batch of uploaded documents. */
  abstract processBatch(dto: ProcessBatchDto): Promise<BatchProcessingResult>;

  /** Process a single replacement document for a failed requirement. */
  abstract processReplacement(dto: ProcessReplacementDto): Promise<{ success: boolean; message: string }>;

  /** Submit a large composite multi-requirement PDF for segregation. */
  abstract processCompositeBatch(dto: ProcessCompositeBatchDto): Promise<{ success: boolean; message: string }>;

  /** Get OCR statuses for a list of document IDs. */
  abstract getStatus(documentIds: string[]): Promise<DocumentStatusResult[]>;

  /** Manually update an OCR field value. */
  abstract updateField(dto: UpdateFieldDto): Promise<{ success: boolean; field: ExtractedFieldEntity }>;

  /** Get all extracted OCR fields for a document. */
  abstract getFields(documentId: string): Promise<ExtractedFieldEntity[]>;

  /** Cascading delete of OCR results when a document is removed. */
  abstract removeDocumentOcr(documentId: string): Promise<void>;

  /** Handle re-execution with Overwrite / Keep Existing Values resolution. */
  abstract handleReExecution(
    documentId: string,
    newExtractedFields: { fieldName: string; value: string | null; confidence: number }[],
    overwrite: boolean,
  ): Promise<ExtractedFieldEntity[]>;
}
