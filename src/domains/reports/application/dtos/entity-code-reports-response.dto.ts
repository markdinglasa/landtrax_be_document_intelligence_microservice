import { Expose, Type } from 'class-transformer';
import { EntityCodeReportItemDto } from './entity-code-report-item.dto';

export class EntityCodeReportsResponseDto {
  @Expose()
  @Type(() => EntityCodeReportItemDto)
  data: EntityCodeReportItemDto[];

  @Expose()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
