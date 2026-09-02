// @ts-ignore
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OCR_BATCH_QUEUE, OCR_PROCESSING_QUEUE } from '../../shared/common/ocr-enums.js';
import { AwsModule } from '../../shared/infrastructure/aws/aws.module.js';
import DocumentEntity from '../../shared/infrastructure/database/entities/document.entity.js';
import OCRRequestHistoryEntity from '../../shared/infrastructure/database/entities/ocr-request-history.entity.js';
import RequirementEntity from '../../shared/infrastructure/database/entities/requirement.entity.js';
import { InternalHttpModule } from '../../shared/infrastructure/http/internal-http.module.js';
import { IPdfSplitterService } from '../../shared/utils/pdf-splitter.service.abstract.js';
import { PdfSplitterService } from '../../shared/utils/pdf-splitter.service.js';
import { ClassificationModule } from '../classification/classification.module.js';
import { ExtractionModule } from '../extraction/extraction.module.js';
import { ValidationModule } from '../validation/validation.module.js';
import { BatchUploadProcessor } from './processors/batch-upload.processor.js';
import { OcrProcessor } from './processors/ocr.processor.js';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: OCR_PROCESSING_QUEUE },
      { name: OCR_BATCH_QUEUE },
    ),
    TypeOrmModule.forFeature([
      DocumentEntity,
      RequirementEntity,
      OCRRequestHistoryEntity,
    ]),
    AwsModule,
    ValidationModule,
    ClassificationModule,
    ExtractionModule,
    InternalHttpModule,
  ],
  providers: [
    { provide: IPdfSplitterService, useClass: PdfSplitterService },
    PdfSplitterService,
    OcrProcessor,
    BatchUploadProcessor,
  ],
  exports: [
    BullModule,
    IPdfSplitterService,
    PdfSplitterService,
  ],
})
export class QueueModule {}
