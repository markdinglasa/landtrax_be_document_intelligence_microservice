export { OCR_PROCESSING_QUEUE, OCR_BATCH_QUEUE } from 'src/shared/common/ocr-enums.js';

export interface OcrJobData {
  documentId: string;
  transactionId: string;
  serviceId?: string | null;
  userId: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  requirementId?: string | null;
  isReplacement?: boolean;
}

export interface BatchUploadJobData {
  transactionId: string;
  serviceId?: string | null;
  userId: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}
