import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BedrockService } from 'src/shared/infrastructure/aws/bedrock.service.js';
import RequirementMappingEntity from 'src/shared/infrastructure/database/entities/requirement-mapping.entity.js';
import RequirementEntity from 'src/shared/infrastructure/database/entities/requirement.entity.js';
import { IClassificationService } from './classification.service.abstract.js';

@Injectable()
export class ClassificationService extends IClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    @InjectRepository(RequirementMappingEntity)
    private readonly requirementMappingRepo: Repository<RequirementMappingEntity>,
    @InjectRepository(RequirementEntity)
    private readonly requirementRepo: Repository<RequirementEntity>,
  ) {
    super();
  }

  /**
   * Classifies a single document based on OCR text.
   */
  async classifyDocument(
    ocrText: string,
    serviceId: string,
  ): Promise<{ requirementId: string; requirementName: string; confidence: number } | null> {
    try {
      const mappings = await this.requirementMappingRepo.find({
        where: { serviceId, deletedDate: IsNull() },
      });

      if (!mappings || mappings.length === 0) {
        return null;
      }

      const requirementNameSet = new Set<string>();
      const requirementMap = new Map<string, string>(); // name to id

      for (const mapping of mappings) {
        const reqId = mapping.sourceRequirementId;
        // Fetch requirement to get name
        if (reqId) {
          const requirement = await this.requirementRepo.findOne({ where: { id: reqId } });
          const reqName = requirement?.name || reqId; 
          requirementNameSet.add(reqName);
          if (!requirementMap.has(reqName)) {
            requirementMap.set(reqName, reqId);
          }
        }
      }

      const requirementNames = Array.from(requirementNameSet);
      if (requirementNames.length === 0) {
        return null;
      }

      // @ts-ignore - Assuming bedrock service has this defined
      const result = await this.bedrockService.classifyDocument(ocrText, requirementNames);
      
      if (result?.requirementName) {
        const reqId = requirementMap.get(result.requirementName) || '';
        return {
          requirementId: reqId,
          requirementName: result.requirementName,
          confidence: result.confidence || 0,
        };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Error classifying document: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Classifies a multi-page document.
   */
  async classifyMultiPageDocument(
    pageTexts: { pageNumber: number; text: string }[],
    serviceId: string,
  ): Promise<{ requirementId: string | null; requirementName: string; pages: number[]; confidence: number }[]> {
    try {
      const classifiedPages: {
        pageNumber: number;
        classification: { requirementId: string; requirementName: string; confidence: number } | null;
      }[] = [];

      for (const page of pageTexts) {
        const classification = await this.classifyDocument(page.text, serviceId);
        classifiedPages.push({
          pageNumber: page.pageNumber,
          classification,
        });
      }

      const results: { requirementId: string | null; requirementName: string; pages: number[]; confidence: number }[] = [];
      
      for (const cp of classifiedPages) {
        const lastGroup = results.at(-1);
        const currentReqName = cp.classification?.requirementName || 'Unclassified';
        const currentReqId = cp.classification?.requirementId || null;
        const currentConfidence = cp.classification?.confidence || 0;

        if (lastGroup?.requirementName === currentReqName) {
          lastGroup.pages.push(cp.pageNumber);
          lastGroup.confidence = (lastGroup.confidence * (lastGroup.pages.length - 1) + currentConfidence) / lastGroup.pages.length;
        } else {
          results.push({
            requirementId: currentReqId,
            requirementName: currentReqName,
            pages: [cp.pageNumber],
            confidence: currentConfidence,
          });
        }
      }

      return results;
    } catch (error: any) {
      this.logger.error(`Error classifying multi-page document: ${error.message}`, error.stack);
      throw error;
    }
  }
}
