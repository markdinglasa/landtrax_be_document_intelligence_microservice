import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AuditReportsQueryDto } from './audit-reports-query.dto';

export class AuditReportsExportQueryDto extends AuditReportsQueryDto {
  @IsOptional()
  @IsEnum(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx' = 'csv';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  exportAll?: boolean = false;
}
