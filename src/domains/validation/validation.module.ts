import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import DocumentEntity from '../../shared/infrastructure/database/entities/document.entity.js';
import RequirementEntity from '../../shared/infrastructure/database/entities/requirement.entity.js';
import RequirementMappingEntity from '../../shared/infrastructure/database/entities/requirement-mapping.entity.js';
import { IValidationService } from './services/validation.service.abstract.js';
import { ValidationService } from './services/validation.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentEntity,
      RequirementEntity,
      RequirementMappingEntity,
    ]),
  ],
  providers: [
    { provide: IValidationService, useClass: ValidationService },
    ValidationService,
  ],
  exports: [IValidationService, ValidationService],
})
export class ValidationModule {}
