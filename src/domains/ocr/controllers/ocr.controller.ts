import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProcessBatchDto } from '../dtos/process-batch.dto.js';
import { ProcessCompositeBatchDto } from '../dtos/process-composite.dto.js';
import { ProcessReplacementDto } from '../dtos/process-replacement.dto.js';
import { UpdateFieldDto } from '../dtos/update-field.dto.js';
import { OcrService } from '../services/ocr.service.js';

@Controller()
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(private readonly ocrService: OcrService) {}

  @MessagePattern('ocr.process.batch')
  async processBatch(@Payload() dto: ProcessBatchDto) {
    this.logger.log(`Received message: ocr.process.batch (transaction=${dto.transactionId})`);
    return this.ocrService.processBatch(dto);
  }

  @MessagePattern('ocr.process.replacement')
  async processReplacement(@Payload() dto: ProcessReplacementDto) {
    this.logger.log(`Received message: ocr.process.replacement (docId=${dto.documentId})`);
    return this.ocrService.processReplacement(dto);
  }

  @MessagePattern('ocr.process.composite')
  async processCompositeBatch(@Payload() dto: ProcessCompositeBatchDto) {
    this.logger.log(`Received message: ocr.process.composite (transaction=${dto.transactionId})`);
    return this.ocrService.processCompositeBatch(dto);
  }

  @MessagePattern('ocr.status')
  async getStatus(@Payload() payload: { documentIds: string[] }) {
    this.logger.log(`Received message: ocr.status for ${payload.documentIds?.length || 0} document(s)`);
    return this.ocrService.getStatus(payload.documentIds || []);
  }

  @MessagePattern('ocr.fields.update')
  async updateField(@Payload() dto: UpdateFieldDto) {
    this.logger.log(`Received message: ocr.fields.update for docId=${dto.documentId}, field=${dto.fieldName}`);
    return this.ocrService.updateField(dto);
  }

  @MessagePattern('ocr.fields.get')
  async getFields(@Payload() payload: { documentId: string }) {
    this.logger.log(`Received message: ocr.fields.get for docId=${payload.documentId}`);
    return this.ocrService.getFields(payload.documentId);
  }

  @MessagePattern('ocr.document.remove')
  async removeDocumentOcr(@Payload() payload: { documentId: string }) {
    this.logger.log(`Received message: ocr.document.remove for docId=${payload.documentId}`);
    await this.ocrService.removeDocumentOcr(payload.documentId);
    return { success: true, message: 'OCR data removed successfully' };
  }
}
