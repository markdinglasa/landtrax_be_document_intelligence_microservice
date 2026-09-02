import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BatchDocumentItemDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  s3Key!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsNumber()
  fileSize!: number;

  @IsString()
  @IsNotEmpty()
  fileType!: string;

  @IsString()
  @IsOptional()
  requirementId?: string | null;
}

export class ProcessBatchDto {
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsString()
  @IsOptional()
  serviceId?: string | null;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchDocumentItemDto)
  documents!: BatchDocumentItemDto[];
}
