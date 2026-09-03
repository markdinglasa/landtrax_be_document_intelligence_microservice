export { OCR_PROCESSING_QUEUE, OCR_BATCH_QUEUE } from '../../shared/common/ocr-enums.js';

export interface OcrJobData {
  documentId: string;
  transactionId: string;
  transactionServiceId?: string | null;
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
  transactionServiceId?: string | null;
  serviceId?: string | null;
  documentId?: string | null;
  userId: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}
