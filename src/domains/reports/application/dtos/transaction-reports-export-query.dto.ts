import { IsOptional, IsEnum } from 'class-validator';
import { TransactionReportsSummaryQueryDto } from './transaction-reports-summary-query.dto';

export class TransactionReportsExportQueryDto extends TransactionReportsSummaryQueryDto {
  @IsOptional()
  @IsEnum(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx' = 'csv';
}
