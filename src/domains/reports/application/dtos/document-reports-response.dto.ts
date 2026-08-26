import { Expose, Type } from 'class-transformer';
import { DocumentReportItemDto } from './document-report-item.dto';

export class DocumentReportsResponseDto {
  @Expose()
  @Type(() => DocumentReportItemDto)
  data!: DocumentReportItemDto[];

  @Expose()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
