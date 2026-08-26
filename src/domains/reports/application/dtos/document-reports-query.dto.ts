import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { USER_TYPE } from 'src/shared/common';

export class DocumentReportsQueryDto {
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
  category?: string; // comma-separated values

  @IsOptional()
  @IsString()
  categories?: string; // comma-separated values

  @IsOptional()
  @IsString()
  types?: string; // comma-separated values

  @IsOptional()
  @IsString()
  type?: string; // comma-separated values

  @IsOptional()
  @IsString()
  statuses?: string; // comma-separated values

  @IsOptional()
  @IsString()
  entityCode?: string;

  @IsOptional()
  @IsEnum(USER_TYPE, { message: `userType must be one of: ${Object.values(USER_TYPE).join(', ')}` })
  userType?: USER_TYPE;

  @IsOptional()
  @IsString()
  uploader?: string;

  @IsOptional()
  @IsString()
  transactionNumber?: string;

  @IsOptional()
  @IsString()
  validationStatus?: string; // comma-separated values

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortDirection?: string = 'desc';
}
