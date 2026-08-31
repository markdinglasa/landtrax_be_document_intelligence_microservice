/**
 * Minimal contract for audit trail writing.
 * Implemented by AuditTrailHttpClient which calls the monolith's internal audit endpoint.
 * In the Strangler Fig plan, the API Gateway handles automatic audit logging;
 * this client is only for explicit, programmatic audit entries.
 */
export abstract class AuditTrailService {
  abstract getUserAuditTrail(userId: string, ...args: any[]): Promise<any>;

  abstract create(dto: {
    userId?: string;
    action: string;
    entity?: string;
    details?: string;
    result?: string;
    ip?: string;
  }): Promise<any>;
}
