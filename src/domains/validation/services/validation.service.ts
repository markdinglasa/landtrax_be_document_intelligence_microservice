import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OCRFailureReason } from '../../../shared/common/ocr-enums.js';
import DocumentEntity from '../../../shared/infrastructure/database/entities/document.entity.js';
import RequirementEntity from '../../../shared/infrastructure/database/entities/requirement.entity.js';
import { IsNull, Repository } from 'typeorm';
import { IValidationService } from './validation.service.abstract.js';

@Injectable()
export class ValidationService extends IValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(RequirementEntity)
    private readonly requirementRepository: Repository<RequirementEntity>,
  ) {
    super();
  }

  /**
   * Validates file size and type against requirement config.
   */
  async validateFile(
    fileName: string,
    fileSize: number,
    fileType: string,
    requirementId: string,
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const requirement = await this.requirementRepository.findOne({
        where: { id: requirementId, deletedDate: IsNull() },
      });

      if (!requirement) {
        return { valid: false, message: 'Requirement not found' };
      }

      if (requirement.maxFileSize && fileSize > requirement.maxFileSize) {
        return {
          valid: false,
          message: `File size exceeds the maximum allowed size of ${requirement.maxFileSize} bytes`,
        };
      }

      if (requirement.acceptedFileTypes) {
        const acceptedTypes = new Set(
          requirement.acceptedFileTypes.split(',').map((t: string) => t.trim().toLowerCase()),
        );
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        if (!acceptedTypes.has(ext) && !acceptedTypes.has(fileType.toLowerCase())) {
          return {
            valid: false,
            message: `File type not accepted. Accepted types are: ${requirement.acceptedFileTypes}`,
          };
        }
      }

      return { valid: true };
    } catch (error: any) {
      this.logger.error(`Error validating file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Checks if a file is a duplicate for a transaction.
   */
  async checkDuplicate(
    fileName: string,
    fileSize: number,
    transactionId: string,
  ): Promise<{ isDuplicate: boolean; message?: string }> {
    try {
      const existingDoc = await this.documentRepository.findOne({
        where: {
          originalFileName: fileName,
          fileSize: fileSize,
          transactionId: transactionId,
          deletedDate: IsNull(),
        },
      });

      if (existingDoc) {
        return {
          isDuplicate: true,
          message: 'The selected file has already been uploaded for this transaction.',
        };
      }

      return { isDuplicate: false };
    } catch (error: any) {
      this.logger.error(`Error checking duplicate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Pre-checks for unreadable conditions.
   */
  detectUnreadableConditions(
    fileBuffer: Buffer,
    fileName: string,
  ): { isReadable: boolean; failureReason?: string } {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return { isReadable: false, failureReason: OCRFailureReason.BLANK_DOCUMENT };
      }

      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        const checkLength = Math.min(fileBuffer.length, 4096);
        const headerSlice = fileBuffer.toString('utf8', 0, checkLength);
        if (headerSlice.includes('/Encrypt')) {
          return { isReadable: false, failureReason: OCRFailureReason.PASSWORD_PROTECTED };
        }
      }

      return { isReadable: true };
    } catch (error: any) {
      this.logger.error(`Error detecting unreadable conditions: ${error.message}`, error.stack);
      throw error;
    }
  }
}
