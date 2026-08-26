import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { USER_TYPE } from 'src/shared/common';

export class TransactionReportsQueryDto {
  @IsOptional()
  @IsDateString()
  @Type(() => String)
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  @Type(() => String)
  dateTo?: string;

  @IsOptional()
  @IsString()
  transactionNumber?: string;

  @IsOptional()
  @IsString()
  entityCode?: string;

  @IsOptional()
  @IsString()
  entityOwner?: string;

  @IsOptional()
  @IsString()
  transactionServiceNumber?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  requestor?: string;

  @IsOptional()
  @IsString()
  proposalRef?: string;

  @IsOptional()
  @IsString()
  location?: string; // comma-separated location names for multi-select filter

  @IsOptional()
  @IsString()
  statuses?: string; // comma-separated values

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(USER_TYPE, { message: `userType must be one of: ${Object.values(USER_TYPE).join(', ')}` })
  userType?: USER_TYPE;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';
}
