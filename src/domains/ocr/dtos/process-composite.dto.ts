import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProcessCompositeBatchDto {
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsString()
  @IsOptional()
  serviceId?: string | null;

  @IsString()
  @IsOptional()
  transactionServiceId?: string | null;

  @IsString()
  @IsOptional()
  documentId?: string | null;

  @IsString()
  @IsNotEmpty()
  userId!: string;

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
}
