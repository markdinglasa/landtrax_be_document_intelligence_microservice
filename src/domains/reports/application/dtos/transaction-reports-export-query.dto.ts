import { IsEnum, IsOptional } from 'class-validator';
export class TransactionReportsExportQueryDto {
  @IsOptional()
  @IsEnum(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx' = 'csv';
}
