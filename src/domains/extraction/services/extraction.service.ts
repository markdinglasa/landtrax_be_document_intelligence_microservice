import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BedrockService } from 'src/shared/infrastructure/aws/bedrock.service.js';
import ExtractedFieldEntity from 'src/shared/infrastructure/database/entities/extracted-field.entity.js';
import RequirementMappingEntity from 'src/shared/infrastructure/database/entities/requirement-mapping.entity.js';
import { IExtractionService } from './extraction.service.abstract.js';

@Injectable()
export class ExtractionService extends IExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    @InjectRepository(ExtractedFieldEntity)
    private readonly extractedFieldRepo: Repository<ExtractedFieldEntity>,
    @InjectRepository(RequirementMappingEntity)
    private readonly requirementMappingRepo: Repository<RequirementMappingEntity>,
  ) {
    super();
  }

  /**
   * Extracts fields from OCR text based on requirement mappings.
   */
  async extractFields(
    ocrText: string,
    requirementId: string,
    serviceId: string,
  ): Promise<{ fieldName: string; value: string | null; confidence: number }[]> {
    try {
      const mappings = await this.requirementMappingRepo.find({
        where: { sourceRequirementId: requirementId, serviceId: serviceId, deletedDate: IsNull() },
      });

      if (!mappings || mappings.length === 0) {
        return [];
      }

      const fieldNames = mappings.map(m => m.targetFieldName).filter(Boolean) as string[];
      
      if (fieldNames.length === 0) {
        return [];
      }

      // @ts-ignore - Assuming bedrock service has this defined
      const extracted = await this.bedrockService.extractFields(ocrText, fieldNames);
      return extracted;
    } catch (error: any) {
      this.logger.error(`Error extracting fields: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Saves extracted fields to the database.
   */
  async saveExtractedFields(
    documentId: string,
    fields: { fieldName: string; value: string | null; confidence: number }[],
  ): Promise<ExtractedFieldEntity[]> {
    try {
      const entitiesToSave = fields.map(field => {
        const entity = this.extractedFieldRepo.create({
          documentId,
          fieldName: field.fieldName,
          fieldValue: field.value,
          confidence: field.confidence,
          isUserModified: false,
          extractedDate: new Date(),
        });
        return entity;
      });

      return await this.extractedFieldRepo.save(entitiesToSave);
    } catch (error: any) {
      this.logger.error(`Error saving extracted fields: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves extracted fields by document ID.
   */
  async getFieldsByDocumentId(documentId: string): Promise<ExtractedFieldEntity[]> {
    try {
      return await this.extractedFieldRepo.find({
        where: { documentId, deletedDate: IsNull() },
      });
    } catch (error: any) {
      this.logger.error(`Error getting fields: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Soft-deletes extracted fields by document ID.
   */
  async deleteFieldsByDocumentId(documentId: string): Promise<void> {
    try {
      const fields = await this.getFieldsByDocumentId(documentId);
      if (fields.length > 0) {
        const now = new Date();
        fields.forEach(f => {
          f.deletedDate = now;
        });
        await this.extractedFieldRepo.save(fields);
      }
    } catch (error: any) {
      this.logger.error(`Error deleting fields: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Checks if any fields have been modified by the user.
   */
  async checkUserModifiedFields(documentId: string): Promise<boolean> {
    try {
      const count = await this.extractedFieldRepo.count({
        where: { documentId, isUserModified: true, deletedDate: IsNull() },
      });
      return count > 0;
    } catch (error: any) {
      this.logger.error(`Error checking user modified fields: ${error.message}`, error.stack);
      throw error;
    }
  }
}
