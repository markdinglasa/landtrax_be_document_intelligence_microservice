// @ts-ignore
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OCR_BATCH_QUEUE, OCR_PROCESSING_QUEUE } from '../../shared/common/ocr-enums.js';
import DocumentEntity from '../../shared/infrastructure/database/entities/document.entity.js';
import TransactionServiceEntity from '../../shared/infrastructure/database/entities/transaction-service.entity.js';
import { OcrReconciliationService } from './services/ocr-reconciliation.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, TransactionServiceEntity]),
    BullModule.registerQueue(
      { name: OCR_PROCESSING_QUEUE },
      { name: OCR_BATCH_QUEUE },
    ),
  ],
  providers: [OcrReconciliationService],
  exports: [OcrReconciliationService],
})
export class ReconciliationModule {}
