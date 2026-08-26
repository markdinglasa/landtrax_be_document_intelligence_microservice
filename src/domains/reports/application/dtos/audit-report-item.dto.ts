import { Expose, Type } from 'class-transformer';

class AuditReportActorDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  email!: string;

  @Expose()
  role!: string;

  /** Individual | Corporate | LandTrax (Administrator) */
  @Expose()
  userType!: string;

  /** Company name — null when not applicable */
  @Expose()
  companyName!: string | null;
}
class AuditReportDetailsDto {
  @Expose()
  oldValue?: any;

  @Expose()
  newValue?: any;

  @Expose()
  message?: string;

  @Expose()
  metadata?: Record<string, any>;
}

export class AuditReportItemDto {
  @Expose()
  id!: string;

  @Expose()
  timestamp!: string;

  @Expose()
  @Type(() => AuditReportActorDto)
  actor!: AuditReportActorDto;

  @Expose()
  actionType!:
    | 'create'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'export'
    | 'import'
    | 'approve'
    | 'reject'
    | 'assign'
    | 'unassign'
    | 'view'
    | 'download'
    | 'upload';

  @Expose()
  entityName?: string;

  @Expose()
  result!: 'success' | 'failure' | 'warning' | 'info';

  @Expose()
  ipAddress?: string;

  @Expose()
  userAgent?: string;

  @Expose()
  @Type(() => AuditReportDetailsDto)
  details!: AuditReportDetailsDto;

  @Expose()
  sessionId?: string;

  @Expose()
  location?: string;
}
