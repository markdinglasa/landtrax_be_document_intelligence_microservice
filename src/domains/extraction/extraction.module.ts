import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import ExtractedFieldEntity from 'src/shared/infrastructure/database/entities/extracted-field.entity.js';
import RequirementMappingEntity from 'src/shared/infrastructure/database/entities/requirement-mapping.entity.js';
import { IExtractionService } from './services/extraction.service.abstract.js';
import { ExtractionService } from './services/extraction.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ExtractedFieldEntity, RequirementMappingEntity])],
  providers: [
    { provide: IExtractionService, useClass: ExtractionService },
    ExtractionService,
  ],
  exports: [IExtractionService, ExtractionService],
})
export class ExtractionModule {}
