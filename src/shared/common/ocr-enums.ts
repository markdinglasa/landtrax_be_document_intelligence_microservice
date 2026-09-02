/**
 * OCR-specific enumerations and constants used across the Document Intelligence pipeline.
 */

/** Real-time OCR processing status displayed to users beside each document. */
export enum OCRStatus {
  PROCESSING = 'OCR - Processing',
  SUCCESS = 'OCR - Success',
  NOT_READABLE = 'OCR Not Readable',
  PROCESSING_FAILED = 'OCR Processing Failed',
}

/** Internal status for OCRRequestHistory logging. */
export enum OCRHistoryStatus {
  SUCCESS = 'SUCCESS',
  FAILED_VALIDATION = 'FAILED_VALIDATION',
  FAILED_OCR = 'FAILED_OCR',
  FAILED_CLASSIFICATION = 'FAILED_CLASSIFICATION',
  FAILED_EXTRACTION = 'FAILED_EXTRACTION',
  NOT_READABLE = 'NOT_READABLE',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
}

/** Audit Trail action values for OCR operations. */
export enum OCRAuditAction {
  EXTRACTION_COMPLETED = 'OCR Extraction Completed',
  UPLOAD_PROCESSED = 'OCR Upload Processed',
  VALUE_UPDATED = 'OCR Value Updated',
  DOCUMENT_NOT_READABLE = 'OCR Document Not Readable',
}

/** Unreadable document failure reasons. */
export enum OCRFailureReason {
  BLANK_DOCUMENT = 'Blank Document',
  CORRUPTED_FILE = 'Corrupted File',
  UNREADABLE_SCAN = 'Unreadable Scanned Document',
  BLURRED_IMAGE = 'Blurred Image or PDF',
  PASSWORD_PROTECTED = 'Password Protected File',
  ENCRYPTED_FILE = 'Encrypted File',
  UNSUPPORTED_CONTENT = 'Unsupported Readable Content',
  TEXT_EXTRACTION_FAILED = 'OCR Service Unable to Extract Text',
}

/** The module name used in Audit Trail entries. */
export const OCR_MODULE_NAME = 'OCR Processing';

/** BullMQ queue names. */
export const OCR_PROCESSING_QUEUE = 'ocr-processing';
export const OCR_BATCH_QUEUE = 'ocr-batch-upload';

/** Confidence score thresholds. */
export const OCR_CONFIDENCE_THRESHOLD = 70;
export const OCR_LOW_CONFIDENCE_THRESHOLD = 50;
