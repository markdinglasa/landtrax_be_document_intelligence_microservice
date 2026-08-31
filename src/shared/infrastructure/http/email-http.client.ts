import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import UserEntity from '../database/entities/user.entity';
import { EmailService } from '../../contracts/email.service.abstract';

/**
 * Calls the monolith's internal email endpoint.
 * Uses fire-and-forget pattern — never blocks the caller.
 * Protected by x-internal-secret header to prevent spoofing.
 */
@Injectable()
export class EmailHttpClient extends EmailService {
  private readonly _logger = new Logger(EmailHttpClient.name);

  constructor(private readonly httpService: HttpService) {
    super();
  }

  async sendAuditExportReadyEmail(
    user: UserEntity,
    downloadUrl: string,
    recordCount: number,
  ): Promise<void> {
    const url = `${process.env.MONOLITH_BASE_URL}/internal/notify/audit-export-ready`;
    this.httpService
      .post(
        url,
        { userId: user.id, downloadUrl, recordCount },
        { headers: { 'x-internal-secret': process.env.APP_AUTH } },
      )
      .subscribe({
        error: (e) =>
          this._logger.error(
            `[EmailHttpClient] Failed to send audit-export-ready email for user ${user.id}: ${e.message}`,
          ),
      });
    // Intentionally fire-and-forget — never block the export job
  }
}
