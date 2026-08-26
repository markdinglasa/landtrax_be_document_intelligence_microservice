import { IsOptional, IsEnum } from 'class-validator';
import { CollectionsReportsSummaryQueryDto } from './collections-reports-summary-query.dto';

export class CollectionsReportsExportQueryDto extends CollectionsReportsSummaryQueryDto {
  @IsOptional()
  @IsEnum(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx' = 'csv';
}
