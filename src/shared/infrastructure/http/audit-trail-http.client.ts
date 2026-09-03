import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AuditTrailService } from '../../contracts/audit-trail.service.abstract.js';

/**
 * Calls the monolith's internal audit-trail endpoint.
 * Fire-and-forget — audit failures never block domain operations.
 */
@Injectable()
export class AuditTrailHttpClient extends AuditTrailService {
  private readonly _logger = new Logger(AuditTrailHttpClient.name);

  constructor(private readonly httpService: HttpService) {
    super();
  }

  getUserAuditTrail(userId: string, ...args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async create(dto: {
    userId?: string;
    action: string;
    entity?: string;
    details?: string;
    result?: string;
    ip?: string;
  }): Promise<any> {
    const baseUrl = process.env.MONOLITH_BASE_URL;
    if (!baseUrl || baseUrl === 'undefined' || baseUrl.trim() === '') {
      this._logger.debug(
        `[AuditTrailHttpClient] MONOLITH_BASE_URL is not configured. Audit trail skipped for action=${dto.action}`,
      );
      return { success: true, skipped: true };
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/internal/audit-trail`;
    this.httpService
      .post(url, dto, {
        headers: { 'x-internal-secret': process.env.APP_AUTH || '' },
      })
      .subscribe({
        error: (e) =>
          this._logger.error(
            `[AuditTrailHttpClient] Failed to write audit trail (action=${dto.action}): ${e.message}`,
          ),
      });
    return { success: true };
  }
}
