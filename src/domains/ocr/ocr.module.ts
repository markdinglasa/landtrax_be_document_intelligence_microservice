import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '../../shared/infrastructure/aws/aws.module.js';
import DocumentEntity from '../../shared/infrastructure/database/entities/document.entity.js';
import ExtractedFieldEntity from '../../shared/infrastructure/database/entities/extracted-field.entity.js';
import OCRRequestHistoryEntity from '../../shared/infrastructure/database/entities/ocr-request-history.entity.js';
import RequirementEntity from '../../shared/infrastructure/database/entities/requirement.entity.js';
import { InternalHttpModule } from '../../shared/infrastructure/http/internal-http.module.js';
import { ClassificationModule } from '../classification/classification.module.js';
import { ExtractionModule } from '../extraction/extraction.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { ValidationModule } from '../validation/validation.module.js';
import { OcrController } from './controllers/ocr.controller.js';
import { IOcrService } from './services/ocr.service.abstract.js';
import { OcrService } from './services/ocr.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentEntity,
      ExtractedFieldEntity,
      RequirementEntity,
      OCRRequestHistoryEntity,
    ]),
    QueueModule,
    ValidationModule,
    ExtractionModule,
    ClassificationModule,
    AwsModule,
    InternalHttpModule,
  ],
  controllers: [OcrController],
  providers: [
    { provide: IOcrService, useClass: OcrService },
    OcrService,
  ],
  exports: [IOcrService, OcrService],
})
export class OcrModule {}
