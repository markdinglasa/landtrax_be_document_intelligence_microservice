import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { ProcessBatchDto } from '../dtos/process-batch.dto.js';
import { ProcessCompositeBatchDto } from '../dtos/process-composite.dto.js';
import { ProcessReplacementDto } from '../dtos/process-replacement.dto.js';
import { UpdateFieldDto } from '../dtos/update-field.dto.js';
import { OcrService } from '../services/ocr.service.js';

@ApiTags('Document Intelligence & OCR')
@Controller(['document-int', 'ocr'])
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(private readonly ocrService: OcrService) {}

  // 0. Health & Verification Test
  @Get('test-ocr')
  @ApiOperation({ summary: 'Test OCR service availability' })
  @ApiResponse({ status: 200, description: 'OCR service is reachable' })
  testOcrHttp() {
    this.logger.log('HTTP GET /test-ocr endpoint reached');
    return { message: 'OCR test successful', status: HttpStatus.OK };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for Document Intelligence & OCR' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealthHttp() {
    return { status: 'OK', service: 'Document Intelligence Microservice' };
  }

  // 1. Discrete Batch Processing
  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a discrete batch of documents for OCR processing' })
  @ApiResponse({ status: 202, description: 'Documents validated and queued for OCR' })
  async processBatchHttp(@Body() dto: ProcessBatchDto) {
    this.logger.log(`HTTP POST /batch (transaction=${dto.transactionId})`);
    return this.ocrService.processBatch(dto);
  }

  @MessagePattern('ocr.process.batch')
  async processBatch(@Payload() dto: ProcessBatchDto) {
    this.logger.log(`Received message: ocr.process.batch (transaction=${dto.transactionId})`);
    return this.ocrService.processBatch(dto);
  }

  // 2. Composite Batch Processing (Multi-page scanned PDF)
  @Post('composite')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a composite multi-page PDF for classification & split OCR' })
  @ApiResponse({ status: 202, description: 'Composite PDF queued for splitting & OCR' })
  async processCompositeBatchHttp(@Body() dto: ProcessCompositeBatchDto) {
    this.logger.log(`HTTP POST /composite (transaction=${dto.transactionId})`);
    return this.ocrService.processCompositeBatch(dto);
  }

  @MessagePattern('ocr.process.composite')
  async processCompositeBatch(@Payload() dto: ProcessCompositeBatchDto) {
    this.logger.log(`Received message: ocr.process.composite (transaction=${dto.transactionId})`);
    return this.ocrService.processCompositeBatch(dto);
  }

  // 3. Single Document Replacement
  @Post('replacement')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a single replacement document for OCR re-processing' })
  async processReplacementHttp(@Body() dto: ProcessReplacementDto) {
    this.logger.log(`HTTP POST /replacement (docId=${dto.documentId})`);
    return this.ocrService.processReplacement(dto);
  }

  @MessagePattern('ocr.process.replacement')
  async processReplacement(@Payload() dto: ProcessReplacementDto) {
    this.logger.log(`Received message: ocr.process.replacement (docId=${dto.documentId})`);
    return this.ocrService.processReplacement(dto);
  }

  // 4. Status Polling
  @Get('status')
  @ApiOperation({ summary: 'Get OCR processing status for a list of document IDs' })
  async getStatusHttp(@Query('documentIds') documentIdsQuery?: string | string[]) {
    let documentIds: string[] = [];
    if (typeof documentIdsQuery === 'string') {
      documentIds = documentIdsQuery.split(',').map((id) => id.trim()).filter(Boolean);
    } else if (Array.isArray(documentIdsQuery)) {
      documentIds = documentIdsQuery;
    }
    this.logger.log(`HTTP GET /status for ${documentIds.length} document(s)`);
    return this.ocrService.getStatus(documentIds);
  }

  @MessagePattern('ocr.status')
  async getStatus(@Payload() payload: { documentIds: string[] }) {
    this.logger.log(
      `Received message: ocr.status for ${payload.documentIds?.length || 0} document(s)`,
    );
    return this.ocrService.getStatus(payload.documentIds || []);
  }

  // 5. Extracted Fields Retrieval
  @Get('fields/:documentId')
  @ApiOperation({ summary: 'Get extracted domain fields for a specific document' })
  async getFieldsHttp(@Param('documentId') documentId: string) {
    this.logger.log(`HTTP GET /fields/${documentId}`);
    return this.ocrService.getFields(documentId);
  }

  @MessagePattern('ocr.fields.get')
  async getFields(@Payload() payload: { documentId: string }) {
    this.logger.log(`Received message: ocr.fields.get for docId=${payload.documentId}`);
    return this.ocrService.getFields(payload.documentId);
  }

  // 6. Manual Field Update
  @Patch('fields')
  @ApiOperation({ summary: 'Update or verify an extracted field value' })
  async updateFieldHttp(@Body() dto: UpdateFieldDto) {
    this.logger.log(`HTTP PATCH /fields (docId=${dto.documentId}, field=${dto.fieldName})`);
    return this.ocrService.updateField(dto);
  }

  @MessagePattern('ocr.fields.update')
  async updateField(@Payload() dto: UpdateFieldDto) {
    this.logger.log(
      `Received message: ocr.fields.update for docId=${dto.documentId}, field=${dto.fieldName}`,
    );
    return this.ocrService.updateField(dto);
  }

  // 7. Remove Document OCR Data
  @Delete('document/:documentId')
  @ApiOperation({ summary: 'Remove OCR extraction data for a document' })
  async removeDocumentOcrHttp(@Param('documentId') documentId: string) {
    this.logger.log(`HTTP DELETE /document/${documentId}`);
    await this.ocrService.removeDocumentOcr(documentId);
    return { success: true, message: 'OCR data removed successfully' };
  }

  @MessagePattern('ocr.document.remove')
  async removeDocumentOcr(@Payload() payload: { documentId: string }) {
    this.logger.log(`Received message: ocr.document.remove for docId=${payload.documentId}`);
    await this.ocrService.removeDocumentOcr(payload.documentId);
    return { success: true, message: 'OCR data removed successfully' };
  }
}
