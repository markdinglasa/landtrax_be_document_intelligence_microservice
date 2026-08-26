import { Expose } from 'class-transformer';

export class AuditReportsExportResponseDto {
  /** True when the export is processed asynchronously (≥10,000 rows) */
  @Expose()
  isAsync!: boolean;

  /** Present for synchronous exports — direct S3 signed URL */
  @Expose()
  downloadUrl?: string;

  /** Present for async exports — poll GET /reports/audit/export/job/:jobId */
  @Expose()
  jobId?: string;

  /** Total records that will be / were exported */
  @Expose()
  recordCount!: number;

  @Expose()
  message!: string;

  @Expose()
  statusCode!: number;
}

export class AuditExportJobStatusResponseDto {
  @Expose()
  jobId!: string;

  @Expose()
  status!: 'pending' | 'processing' | 'completed' | 'failed';

  @Expose()
  format!: string;

  @Expose()
  recordCount?: number | null;

  @Expose()
  downloadUrl?: string | null;

  @Expose()
  errorMessage?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  completedAt?: Date | null;
}
