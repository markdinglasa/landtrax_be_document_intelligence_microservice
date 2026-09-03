export abstract class IValidationService {
  /** Validates file size and type against requirement config. */
  abstract validateFile(
    fileName: string,
    fileSize: number,
    fileType: string,
    requirementId: string,
  ): Promise<{ valid: boolean; message?: string }>;

  /** Checks if a file or requirement is a duplicate for a transaction. */
  abstract checkDuplicate(
    fileName: string,
    fileSize: number,
    transactionId: string,
    requirementId?: string | null,
    serviceId?: string | null,
  ): Promise<{ isDuplicate: boolean; message?: string }>;

  /** Pre-checks for unreadable conditions (blank buffer, encrypted PDF, unsupported format). */
  abstract detectUnreadableConditions(
    fileBuffer: Buffer,
    fileName: string,
    fileType?: string,
  ): { isReadable: boolean; failureReason?: string };
}
