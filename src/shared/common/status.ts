export enum Status {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
  PASSWORD_PENDING = 'Pending Password Setup',
  ACTIVE = 'Active',
}

export enum AuditTrailStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
}

export type BusinessType = 'INDIVIDUAL' | 'SOLE PROPRIETORSHIP' | 'PARTNERSHIP' | 'CORPORATE';

export enum EntityCodeStatus {
  CREATED = 'Created',
  USED = 'Used',
  ACTIVATED = 'Activated',
  DEACTIVATED = 'Deactivated',
  DELETED = 'Deleted',
}
