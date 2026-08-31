import UserEntity from '../infrastructure/database/entities/user.entity';

/**
 * Abstract contract for email notification.
 * Implemented by EmailHttpClient which calls the monolith's internal email endpoint.
 */
export abstract class EmailService {
  abstract sendAuditExportReadyEmail(
    user: UserEntity,
    downloadUrl: string,
    recordCount: number,
  ): Promise<void>;
}
