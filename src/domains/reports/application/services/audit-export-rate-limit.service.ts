import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job-entity';

/** Rolling-window threshold (records) that classifies an export as "large-scale" */
export const LARGE_EXPORT_THRESHOLD = 10_000;

/** Max large-scale export jobs allowed within the rolling window */
export const LARGE_EXPORT_HOURLY_LIMIT = 3;

/**
 * US002 — Enforces a global limit of 3 large-scale (≥10,000 row) audit export
 * jobs per rolling one-hour window across all users.
 *
 * Uses the AuditExportJob table as source of truth — no Redis required.
 */
@Injectable()
export class AuditExportRateLimitService {
  constructor(
    @InjectRepository(AuditExportJobEntity)
    private readonly _jobRepo: Repository<AuditExportJobEntity>,
  ) {}

  /**
   * Returns true when the global hourly limit has been reached.
   * Counts jobs created in the last 60 minutes with recordCount >= threshold.
   */
  async isLimitReached(): Promise<boolean> {
    const count = await this._getLargeJobCountInWindow();
    return count >= LARGE_EXPORT_HOURLY_LIMIT;
  }

  /**
   * Returns how many large-scale export slots remain in the current window.
   */
  async getRemainingSlots(): Promise<number> {
    const count = await this._getLargeJobCountInWindow();
    return Math.max(0, LARGE_EXPORT_HOURLY_LIMIT - count);
  }

  private async _getLargeJobCountInWindow(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000);

    return this._jobRepo
      .createQueryBuilder('job')
      .where('job.createdAt >= :oneHourAgo', { oneHourAgo })
      .andWhere('job.recordCount >= :threshold', { threshold: LARGE_EXPORT_THRESHOLD })
      .getCount();
  }
}
