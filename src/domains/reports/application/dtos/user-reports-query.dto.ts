import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { USER_TYPE } from 'src/shared/common';

export class UserReportsQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  statuses?: string;

  @IsOptional()
  @IsString()
  registrationStatus?: string;

  @IsOptional()
  @IsString()
  registrationStatuses?: string;

  @IsOptional()
  @IsDateString()
  lastLoginFrom?: string;

  @IsOptional()
  @IsDateString()
  lastLoginTo?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  entityCode?: string;

  @IsOptional()
  @IsEnum(USER_TYPE, { message: `userType must be one of: ${Object.values(USER_TYPE).join(', ')}` })
  userType?: USER_TYPE;

  @IsOptional()
  @IsString()
  verificationStatus?: string; // comma-separated values

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
  sortBy?: string = 'registeredAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  registryOfDeedIds?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
