import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity.js';
import RequirementEntity from 'src/shared/infrastructure/database/entities/requirement.entity.js';
import { IValidationService } from './services/validation.service.abstract.js';
import { ValidationService } from './services/validation.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, RequirementEntity])],
  providers: [
    { provide: IValidationService, useClass: ValidationService },
    ValidationService,
  ],
  exports: [IValidationService, ValidationService],
})
export class ValidationModule {}
