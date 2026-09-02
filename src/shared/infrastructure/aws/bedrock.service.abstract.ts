export interface ClassificationResult {
  requirementName: string;
  confidence: number;
}

export interface FieldExtractionResult {
  fieldName: string;
  value: string | null;
  confidence: number;
}

export abstract class IBedrockService {
  /** Classify document text into one of the provided requirement names. */
  abstract classifyDocument(
    ocrText: string,
    requirementNames: string[],
  ): Promise<ClassificationResult | null>;

  /** Extract specific fields from the document text. */
  abstract extractFields(
    ocrText: string,
    fieldNames: string[],
  ): Promise<FieldExtractionResult[]>;
}
