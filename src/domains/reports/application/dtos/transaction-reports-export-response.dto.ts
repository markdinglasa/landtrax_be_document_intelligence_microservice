import { Expose } from 'class-transformer';

export class TransactionReportsExportResponseDto {
  @Expose()
  downloadUrl?: string;

  @Expose()
  jobId?: string;

  @Expose()
  message!: string;

  @Expose()
  statusCode!: number;
}
