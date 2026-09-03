import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OCRFailureReason } from '../../../shared/common/ocr-enums.js';
import DocumentEntity from '../../../shared/infrastructure/database/entities/document.entity.js';
import RequirementEntity from '../../../shared/infrastructure/database/entities/requirement.entity.js';
import RequirementMappingEntity from '../../../shared/infrastructure/database/entities/requirement-mapping.entity.js';
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
    @InjectRepository(RequirementMappingEntity)
    private readonly requirementMappingRepo: Repository<RequirementMappingEntity>,
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
   * Checks if a file or requirement is a duplicate for a transaction.
   */
  // SONARQUBE ISSUE - Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. [+10 locations]sonarqube
  async checkDuplicate(
    fileName: string,
    fileSize: number,
    transactionId: string,
    requirementId?: string | null,
    serviceId?: string | null,
  ): Promise<{ isDuplicate: boolean; message?: string }> {
    try {
      // 1. Exact file duplicate check (FileName + FileSize) within transaction
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

      // 2. Requirement / Requirement-Mapping duplicate check within transaction
      if (requirementId) {
        const existingReqDoc = await this.documentRepository.findOne({
          where: {
            transactionId: transactionId,
            requirementId: requirementId,
            deletedDate: IsNull(),
          },
        });

        if (existingReqDoc) {
          const req = await this.requirementRepository.findOne({
            where: { id: requirementId, deletedDate: IsNull() },
          });
          const reqName = req?.name || 'specified';
          return {
            isDuplicate: true,
            message: `The requirement '${reqName}' has already been processed for this transaction.`,
          };
        }

        if (serviceId) {
          const mapping = await this.requirementMappingRepo.findOne({
            where: [
              { sourceRequirementId: requirementId, serviceId: serviceId, deletedDate: IsNull() },
              { targetRequirementId: requirementId, serviceId: serviceId, deletedDate: IsNull() },
            ],
          });

          if (mapping) {
            const relatedReqId =
              mapping.sourceRequirementId === requirementId
                ? mapping.targetRequirementId
                : mapping.sourceRequirementId;

            if (relatedReqId && relatedReqId !== requirementId) {
              const existingMappedDoc = await this.documentRepository.findOne({
                where: {
                  transactionId: transactionId,
                  requirementId: relatedReqId,
                  deletedDate: IsNull(),
                },
              });

              if (existingMappedDoc) {
                const req = await this.requirementRepository.findOne({
                  where: { id: requirementId, deletedDate: IsNull() },
                });
                const reqName = req?.name || 'specified';
                return {
                  isDuplicate: true,
                  message: `The requirement '${reqName}' has already been processed for this transaction.`,
                };
              }
            }
          }
        }
      }

      return { isDuplicate: false };
    } catch (error: any) {
      this.logger.error(`Error checking duplicate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /** Supported extensions for OCR extraction */
  private static readonly SUPPORTED_EXTENSIONS = new Set([
    'pdf',
    'png',
    'jpg',
    'jpeg',
    'tiff',
    'tif',
  ]);

  /**
   * Pre-checks for unreadable conditions (blank buffer, unsupported format, encrypted PDF).
   */
  detectUnreadableConditions(
    fileBuffer: Buffer,
    fileName: string,
    fileType?: string,
  ): { isReadable: boolean; failureReason?: string } {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return { isReadable: false, failureReason: OCRFailureReason.BLANK_DOCUMENT };
      }

      const ext = fileName.split('.').pop()?.toLowerCase() || '';

      // Check if file format is supported by OCR engines (Textract / Image readers)
      if (ext && !ValidationService.SUPPORTED_EXTENSIONS.has(ext)) {
        return { isReadable: false, failureReason: OCRFailureReason.UNSUPPORTED_CONTENT };
      }

      if (fileType && !fileType.includes('pdf') && !fileType.includes('image') && !fileType.includes('octet-stream')) {
        return { isReadable: false, failureReason: OCRFailureReason.UNSUPPORTED_CONTENT };
      }

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
