import { Expose } from 'class-transformer';

export class CollectionsReportsExportResponseDto {
  @Expose()
  downloadUrl?: string;

  @Expose()
  jobId?: string;

  @Expose()
  message: string;

  @Expose()
  statusCode: number;
}
