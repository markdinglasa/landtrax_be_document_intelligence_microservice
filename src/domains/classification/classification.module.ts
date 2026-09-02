import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import RequirementMappingEntity from '../../shared/infrastructure/database/entities/requirement-mapping.entity.js';
import RequirementEntity from '../../shared/infrastructure/database/entities/requirement.entity.js';
import { IClassificationService } from './services/classification.service.abstract.js';
import { ClassificationService } from './services/classification.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RequirementMappingEntity, RequirementEntity])],
  providers: [
    { provide: IClassificationService, useClass: ClassificationService },
    ClassificationService,
  ],
  exports: [IClassificationService, ClassificationService],
})
export class ClassificationModule {}
