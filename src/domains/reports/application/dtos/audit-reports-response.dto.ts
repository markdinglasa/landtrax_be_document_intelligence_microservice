import { Expose, Type } from 'class-transformer';
import { AuditReportItemDto } from './audit-report-item.dto';

export class AuditReportsResponseDto {
  @Expose()
  @Type(() => AuditReportItemDto)
  data!: AuditReportItemDto[];

  @Expose()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
