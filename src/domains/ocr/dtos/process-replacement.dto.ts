import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProcessReplacementDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  requirementId!: string;

  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsString()
  @IsOptional()
  serviceId?: string | null;

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
