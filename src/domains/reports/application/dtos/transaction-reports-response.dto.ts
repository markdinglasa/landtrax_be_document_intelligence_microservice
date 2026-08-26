import { Expose, Type } from 'class-transformer';
import { TransactionReportItemDto } from './transaction-report-item.dto';

export class TransactionReportsResponseDto {
  @Expose()
  @Type(() => TransactionReportItemDto)
  data!: TransactionReportItemDto[];

  @Expose()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
