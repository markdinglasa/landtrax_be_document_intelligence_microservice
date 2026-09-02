export interface ClassificationResult {
  requirementId: string;
  requirementName: string;
  confidence: number;
}

export interface MultiPageClassificationGroup {
  requirementId: string | null;
  requirementName: string;
  pages: number[];
  confidence: number;
}

export abstract class IClassificationService {
  /** Classifies a single document based on OCR text. */
  abstract classifyDocument(
    ocrText: string,
    serviceId: string,
  ): Promise<ClassificationResult | null>;

  /** Classifies a multi-page document into grouped consecutive page segments. */
  abstract classifyMultiPageDocument(
    pageTexts: { pageNumber: number; text: string }[],
    serviceId: string,
  ): Promise<MultiPageClassificationGroup[]>;
}
