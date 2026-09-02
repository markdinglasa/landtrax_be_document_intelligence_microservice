import ExtractedFieldEntity from 'src/shared/infrastructure/database/entities/extracted-field.entity.js';

export interface ExtractedFieldItem {
  fieldName: string;
  value: string | null;
  confidence: number;
}

export abstract class IExtractionService {
  /** Extracts fields from OCR text based on requirement mappings. */
  abstract extractFields(
    ocrText: string,
    requirementId: string,
    serviceId: string,
  ): Promise<ExtractedFieldItem[]>;

  /** Saves extracted fields to the database. */
  abstract saveExtractedFields(
    documentId: string,
    fields: ExtractedFieldItem[],
  ): Promise<ExtractedFieldEntity[]>;

  /** Retrieves extracted fields by document ID. */
  abstract getFieldsByDocumentId(documentId: string): Promise<ExtractedFieldEntity[]>;

  /** Soft-deletes extracted fields by document ID. */
  abstract deleteFieldsByDocumentId(documentId: string): Promise<void>;

  /** Checks if any fields have been modified by the user. */
  abstract checkUserModifiedFields(documentId: string): Promise<boolean>;
}
