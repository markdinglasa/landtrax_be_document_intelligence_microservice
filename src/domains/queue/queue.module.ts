// @ts-ignore
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OCR_BATCH_QUEUE, OCR_PROCESSING_QUEUE } from 'src/shared/common/ocr-enums.js';
import { AwsModule } from 'src/shared/infrastructure/aws/aws.module.js';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity.js';
import OCRRequestHistoryEntity from 'src/shared/infrastructure/database/entities/ocr-request-history.entity.js';
import RequirementEntity from 'src/shared/infrastructure/database/entities/requirement.entity.js';
import { InternalHttpModule } from 'src/shared/infrastructure/http/internal-http.module.js';
import { IPdfSplitterService } from 'src/shared/utils/pdf-splitter.service.abstract.js';
import { PdfSplitterService } from 'src/shared/utils/pdf-splitter.service.js';
import { ClassificationModule } from 'src/domains/classification/classification.module.js';
import { ExtractionModule } from 'src/domains/extraction/extraction.module.js';
import { ValidationModule } from 'src/domains/validation/validation.module.js';
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
