import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { USER_TYPE } from 'src/shared/common';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job-entity';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import { EmailService } from '../../email/types';
import S3StorageService from '../../storage/s3-storage-service';
import { AuditReportsExportQueryDto } from '../dtos/audit-reports-export-query.dto';
import {
  AuditExportJobStatusResponseDto,
  AuditReportsExportResponseDto,
} from '../dtos/audit-reports-export-response.dto';
import { AuditReportsQueryDto } from '../dtos/audit-reports-query.dto';
import { AuditReportsResponseDto } from '../dtos/audit-reports-response.dto';
import { AuditCsvGenerator, AuditExportRow } from '../../infrastructure/utils/audit-csv-generator';
import { AuditXlsxGenerator } from '../../infrastructure/utils/audit-xlsx-generator';
import { FileUtils } from '../../infrastructure/utils/file-utils';
import {
  AuditExportRateLimitService,
  LARGE_EXPORT_THRESHOLD,
} from './audit-export-rate-limit.service';

@Injectable()
export class AuditReportsService {
  private readonly _logger = new Logger(AuditReportsService.name);

  constructor(
    @InjectRepository(AuditTrailEntity)
    private readonly _auditTrailRepo: Repository<AuditTrailEntity>,
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
    @InjectRepository(AuditExportJobEntity)
    private readonly _exportJobRepo: Repository<AuditExportJobEntity>,
    private readonly _storageService: S3StorageService,
    @Inject(EmailService)
    private readonly _emailService: EmailService,
    private readonly _rateLimitService: AuditExportRateLimitService,
  ) {}

  async getAuditReports(filters: AuditReportsQueryDto): Promise<AuditReportsResponseDto> {
    try {
      const system = await this._userRepo.findOne({ where: { username: 'SYSTEM' } });
      if (!system) throw new BadRequestException('Sorry, Something went wrong.');

      const queryBuilder = this._auditTrailRepo
        .createQueryBuilder('auditTrail')
        .leftJoinAndSelect('auditTrail.user', 'user')
        .leftJoinAndSelect('user.userCompanies', 'uc')
        .leftJoinAndSelect('uc.company', 'c')

        .where('(auditTrail.userId IS NULL OR auditTrail.userId != :systemUserId)', {
          systemUserId: system.id,
        });

      this.applyAuditReportDateRangeFilters(queryBuilder, filters);
      this.applyAuditReportsFilters(queryBuilder, filters);

      if (filters.company) {
        queryBuilder.andWhere('c.name = :company', { company: filters.company });
      }
      const sortBy = filters.sortBy || 'timestamp';
      const sortDirection = filters.sortDirection || 'desc';
      const sortFieldMapping = {
        timestamp: 'auditTrail.timestamp',
        actor: 'user.firstName',
        actionType: 'auditTrail.action',
        entity: 'auditTrail.resource',
        result: 'auditTrail.status',
      };
      const dbSortField =
        sortFieldMapping[sortBy as keyof typeof sortFieldMapping] || 'auditTrail.timestamp';
      queryBuilder.orderBy(dbSortField, sortDirection.toUpperCase() as 'ASC' | 'DESC');

      const total = await queryBuilder.getCount();
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);
      const offset = (page - 1) * limit;

      queryBuilder.take(limit).skip(offset);

      const auditTrails = await queryBuilder.getMany();
      const data = auditTrails.map((auditTrail) => this.transformAuditReportItem(auditTrail));
      const totalPages = Math.ceil(total / limit);

      return { data, meta: { total, page, limit, totalPages } };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error(`Error generating audit reports: ${(e as Error).message}`);
      return { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    }
  }

  private transformAuditReportItem(auditTrail: AuditTrailEntity): any {
    const resultMapping: Record<string, string> = {
      SUCCESS: 'success',
      FAILED: 'failure',
      ERROR: 'warning',
      PENDING: 'info',
    };

    const actionTypeMapping: Record<string, string> = {
      LOGIN: 'login',
      LOGOUT: 'logout',
      CREATE: 'create',
      UPDATE: 'update',
      DELETE: 'delete',
      EXPORT: 'export',
      IMPORT: 'import',
      APPROVE: 'approve',
      REJECT: 'reject',
      ASSIGN: 'assign',
      UNASSIGN: 'unassign',
      VIEW: 'view',
      DOWNLOAD: 'download',
      UPLOAD: 'upload',
    };

    let details: {
      oldValue?: any;
      newValue?: any;
      message?: string;
      metadata?: Record<string, any>;
    } = { message: auditTrail.details || undefined };

    try {
      if (auditTrail.details) {
        const parsed = JSON.parse(auditTrail.details);
        details = {
          oldValue: parsed.oldValue,
          newValue: parsed.newValue,
          message: parsed.message,
          metadata: parsed.metadata,
        };
      }
    } catch {
      details = { message: auditTrail.details || undefined };
    }

    const entityId = details.metadata?.entityId || auditTrail.area || '';
    const entityName = details.metadata?.entityName;
    const sessionId =
      details.metadata?.sessionId ||
      (auditTrail.area?.startsWith('session:')
        ? auditTrail.area.replace('session:', '')
        : undefined);
    const userAgent = details.metadata?.userAgent;
    const location = details.metadata?.location;

    // Derive user type label and company name from the joined user entity
    const userTypeLabelMap: Record<string, string> = {
      [USER_TYPE.ADMINISTRATOR]: 'LandTrax',
      [USER_TYPE.INDIVIDUAL]: 'Individual',
      [USER_TYPE.CORPORATE]: 'Corporate',
    };
    const userTypeLabel = auditTrail.user
      ? (userTypeLabelMap[auditTrail.user.type] ?? auditTrail.user.type)
      : 'Unknown';
    const companyName = auditTrail.user?.companyName ?? null;

    return {
      id: auditTrail.id,
      timestamp: auditTrail.timestamp.toISOString(),
      actor: auditTrail.user
        ? {
            id: auditTrail.user.id,
            name: `${auditTrail.user.firstName || ''} ${auditTrail.user.lastName || ''}`.trim(),
            email: auditTrail.user.email || '',
            role: 'User',
            userType: userTypeLabel,
            companyName,
          }
        : {
            id: '',
            name: 'Unknown User',
            email: '',
            role: 'Unknown',
            userType: 'Unknown',
            companyName: null,
          },
      actionType: auditTrail.action
        ? actionTypeMapping[auditTrail.action.toUpperCase()] || auditTrail.action.toLowerCase()
        : 'view',
      entity: auditTrail.resource || 'unknown',
      entityId,
      entityName,
      result: resultMapping[auditTrail.status] || 'info',
      ipAddress: auditTrail.ipAddress || undefined,
      userAgent,
      details,
      sessionId,
      location,
    };
  }

  private applyAuditReportDateRangeFilters(
    queryBuilder: SelectQueryBuilder<AuditTrailEntity>,
    filters: AuditReportsQueryDto,
  ): void {
    const resolvedDateTo = this._resolveDateRange(filters);
    this._applyDateFilters(queryBuilder, filters, resolvedDateTo);
    this._applySearchFilter(queryBuilder, filters.search);
    this._applyActorFilter(queryBuilder, filters.actor);
    this._applyActionTypeFilter(queryBuilder, filters.actionType);
    this._applyEntityFilter(queryBuilder, filters.entity);
    this._applyResultFilter(queryBuilder, filters.result);
    this._applyIpAddressFilter(queryBuilder, filters.ipAddress);
    this._applySessionIdFilter(queryBuilder, filters.sessionId);
    this._applyUserTypeFilter(queryBuilder, filters.userType);
  }

  /** Resolves and validates the date range, returning the normalised dateTo string. */
  private _resolveDateRange(filters: AuditReportsQueryDto): string | null {
    const dateFrom = filters.dateFrom || null;
    let dateTo = filters.dateTo || null;

    if (dateFrom && !dateTo) {
      dateTo = new Date().toISOString().split('T')[0];
    }

    if (dateTo) {
      const dateString = dateTo.includes('T') ? dateTo.split('T')[0] : dateTo;
      dateTo = `${dateString}T23:59:59.999Z`;
    }

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return dateTo;
  }

  private _applyDateFilters(
    qb: SelectQueryBuilder<AuditTrailEntity>,
    filters: AuditReportsQueryDto,
    resolvedDateTo: string | null,
  ): void {
    if (filters.dateFrom) {
      qb.andWhere('auditTrail.timestamp >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }
    if (filters.dateTo && resolvedDateTo) {
      qb.andWhere('auditTrail.timestamp <= :dateTo', { dateTo: new Date(resolvedDateTo) });
    }
  }

  private _applySearchFilter(qb: SelectQueryBuilder<AuditTrailEntity>, search?: string): void {
    if (!search) return;
    this._ensureUserJoin(qb);
    qb.andWhere(
      'LOWER(CAST(auditTrail.details AS NVARCHAR(MAX))) LIKE :search' +
        ' OR LOWER(auditTrail.resource) LIKE :search' +
        ' OR LOWER(auditTrail.status) LIKE :search' +
        ' OR LOWER(auditTrail.area) LIKE :search' +
        ' OR LOWER(auditTrail.timestamp) LIKE :search' +
        //' OR LOWER(c.name) LIKE :search' +
        ' OR LOWER(user.firstName) LIKE :search' +
        ' OR LOWER(user.lastName) LIKE :search' +
        ' OR LOWER(user.email) LIKE :search' +
        ' OR LOWER(user.type) LIKE :search' +
        ' OR auditTrail.action LIKE :search',
      { search: `%${search.toLowerCase()}%` },
    );
  }

  private _applyActorFilter(qb: SelectQueryBuilder<AuditTrailEntity>, actor?: string): void {
    if (!actor) return;
    this._ensureUserJoin(qb);
    qb.andWhere(
      '(user.firstName LIKE :actor OR user.lastName LIKE :actor OR user.email LIKE :actor)',
      { actor: `%${actor}%` },
    );
  }

  private _applyActionTypeFilter(
    qb: SelectQueryBuilder<AuditTrailEntity>,
    actionType?: string,
  ): void {
    if (!actionType) return;
    const actionTypes = actionType.split(',').map((a) => a.trim());
    qb.andWhere('auditTrail.action IN (:...actionTypes)', { actionTypes });
  }

  private _applyEntityFilter(qb: SelectQueryBuilder<AuditTrailEntity>, entity?: string): void {
    if (!entity) return;
    qb.andWhere('auditTrail.resource = :entity', { entity });
  }

  private _applyResultFilter(qb: SelectQueryBuilder<AuditTrailEntity>, result?: string): void {
    if (!result) return;
    const statusMapping: Record<string, string> = {
      success: 'SUCCESS',
      failure: 'FAILED',
      warning: 'ERROR',
      info: 'PENDING',
    };
    const status = statusMapping[result];
    if (status) qb.andWhere('auditTrail.status = :status', { status });
  }

  private _applyIpAddressFilter(
    qb: SelectQueryBuilder<AuditTrailEntity>,
    ipAddress?: string,
  ): void {
    if (!ipAddress) return;
    qb.andWhere('auditTrail.ipAddress LIKE :ipAddress', { ipAddress: `%${ipAddress}%` });
  }

  private _applySessionIdFilter(
    qb: SelectQueryBuilder<AuditTrailEntity>,
    sessionId?: string,
  ): void {
    if (!sessionId) return;
    qb.andWhere('(auditTrail.area LIKE :sessionId OR auditTrail.details LIKE :sessionId)', {
      sessionId: `%${sessionId}%`,
    });
  }

  private _applyUserTypeFilter(qb: SelectQueryBuilder<AuditTrailEntity>, userType?: string): void {
    if (!userType) return;

    // Map frontend filter values to USER_TYPE enum values
    // Filter directly on user.type field instead of role relationships
    const userTypeMap: Record<string, USER_TYPE> = {
      Individual: USER_TYPE.INDIVIDUAL,
      Corporate: USER_TYPE.CORPORATE,
    };

    const mappedUserType = userTypeMap[userType];
    if (!mappedUserType) return;

    // Filter on the user's type field directly
    qb.andWhere('user.type = :userType', { userType: mappedUserType });
  }

  /** Applies all non-date filters from the query DTO to the given query builder. */
  applyAuditReportsFilters(
    qb: SelectQueryBuilder<AuditTrailEntity>,
    filters: AuditReportsQueryDto,
  ): void {
    this._applySearchFilter(qb, filters.search);
    this._applyActorFilter(qb, filters.actor);
    this._applyActionTypeFilter(qb, filters.actionType);
    this._applyEntityFilter(qb, filters.entity);
    this._applyResultFilter(qb, filters.result);
    this._applyIpAddressFilter(qb, filters.ipAddress);
    this._applySessionIdFilter(qb, filters.sessionId);
    this._applyUserTypeFilter(qb, filters.userType);
  }

  /** Adds a LEFT JOIN on user if one hasn't been added yet. */
  private _ensureUserJoin(qb: SelectQueryBuilder<AuditTrailEntity>): void {
    const hasUserJoin = qb.expressionMap.joinAttributes.some((j) => j.alias.name === 'user');
    if (!hasUserJoin) qb.leftJoin('auditTrail.user', 'user');
  }

  /** Adds LEFT JOINs for company if not already present. */
  private _ensureCompanyJoin(qb: SelectQueryBuilder<AuditTrailEntity>): void {
    const hasCompanyJoin = qb.expressionMap.joinAttributes.some((j) => j.alias.name === 'company');
    if (!hasCompanyJoin) {
      this._ensureUserJoin(qb);
      qb.leftJoin('user.userCompanies', 'ensureCompany_uc');
      qb.leftJoin('ensureCompany_uc.company', 'company');
    }
  }

  // ─────────────────────────── Export ───────────────────────────────────────

  /**
   * Entry point for CSV / XLSX export.
   *
   * < 10,000 rows  → synchronous: generate file → S3 → return signed URL immediately.
   * ≥ 10,000 rows  → async: check US002 rate limit → create job → fire background
   *                   processor → return jobId for polling.
   */
  async exportAuditReports(
    filters: AuditReportsExportQueryDto,
    user: UserEntity,
  ): Promise<AuditReportsExportResponseDto> {
    try {
      const system = await this._userRepo.findOne({ where: { username: 'SYSTEM' } });
      if (!system) throw new BadRequestException('Sorry, Something went wrong.');

      // Count matching records first
      const countQb = this._auditTrailRepo
        .createQueryBuilder('auditTrail')
        .leftJoin('auditTrail.user', 'user')
        .where('(auditTrail.userId IS NULL OR auditTrail.userId != :systemUserId)', {
          systemUserId: system.id,
        });
      this.applyAuditReportDateRangeFilters(countQb, filters);
      if (filters.company) {
        this._ensureCompanyJoin(countQb);
        countQb.andWhere('company.name = :company', { company: filters.company });
      }
      const recordCount = await countQb.getCount();

      this._logger.log(
        `Export requested: ${recordCount} records (threshold: ${LARGE_EXPORT_THRESHOLD}). ` +
          `Will use ${recordCount < LARGE_EXPORT_THRESHOLD ? 'SYNC' : 'ASYNC'} export.`,
      );

      // Small exports (< 10,000 records) → sync download (not subject to rate limit)
      if (recordCount < LARGE_EXPORT_THRESHOLD) {
        this._logger.log(
          `[AUDIT] Small-scale export accepted: ${recordCount} records for user ${user.id} (${user.email}). ` +
            `Not subject to rate limiting.`,
        );
        return this._runSynchronousExport(filters, system, recordCount);
      }

      // Large exports (≥ 10,000 records) → async job + email (subject to rate limit)
      this._logger.log(
        `[AUDIT] Large-scale export requested: ${recordCount} records for user ${user.id} (${user.email}). ` +
          `Checking rate limit...`,
      );

      // Large-scale path (≥10,000 records) — check rate limit first

      const limitReached = await this._rateLimitService.isLimitReached();
      const remainingSlots = await this._rateLimitService.getRemainingSlots();

      if (limitReached) {
        this._logger.warn(
          `[AUDIT] Large-scale export REJECTED: Rate limit reached (3/hour). ` +
            `User ${user.id} (${user.email}) attempted to export ${recordCount} records.`,
        );
        throw new BadRequestException(
          'The maximum number of large scale audit log exports has been reached for the current hour. Please try again later.',
        );
      }

      this._logger.log(
        `[AUDIT] Large-scale export ACCEPTED: ${recordCount} records for user ${user.id} (${user.email}). ` +
          `Remaining slots: ${remainingSlots - 1}/3 (after this request).`,
      );

      return this._createAsyncExportJob(filters, user, recordCount);
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this._logger.error(
        `exportAuditReports error: ${(e as Error).message}\n${(e as Error).stack}`,
      );
      throw new BadRequestException(`Failed to initiate audit log export: ${(e as Error).message}`);
    }
  }

  private async _runSynchronousExport(
    filters: AuditReportsExportQueryDto,
    system: UserEntity,
    recordCount: number,
  ): Promise<AuditReportsExportResponseDto> {
    const rows = await this._fetchAllAuditRows(filters, system);
    const format = filters.format ?? 'csv';
    const { buffer, filename } = await this._generateFile(rows, format);

    const mimeType = FileUtils.getMimeType(format);
    const file = FileUtils.createFileFromBuffer(buffer, filename, mimeType);

    const uploadResult = await this._storageService.uploadFile({
      file,
      folder: 'exports/reports/audit',
      fileName: filename,
    });

    const downloadUrl = await this._storageService.getSignedUrl(uploadResult.key, 86_400);

    return {
      isAsync: false,
      downloadUrl,
      recordCount,
      message: `Audit logs exported successfully. ${recordCount} records exported.`,
      statusCode: 200,
    };
  }

  private async _createAsyncExportJob(
    filters: AuditReportsExportQueryDto,
    user: UserEntity,
    recordCount: number,
  ): Promise<AuditReportsExportResponseDto> {
    const job = this._exportJobRepo.create({
      id: uuidv4(),
      userId: user.id,
      status: 'pending',
      format: filters.format ?? 'csv',
      filters: JSON.stringify(filters),
      recordCount,
    });
    await this._exportJobRepo.save(job);

    // Fire-and-forget — runs outside the request cycle
    setImmediate(() => {
      void this._processAsyncExportJob(job.id, user);
    });

    return {
      isAsync: true,
      jobId: job.id,
      recordCount,
      message: 'Exporting in background...',
      statusCode: 202,
    };
  }

  /**
   * Background processor for large-scale async export jobs.
   * Called via setImmediate — errors are caught and persisted to the job row.
   */
  private async _processAsyncExportJob(jobId: string, user: UserEntity): Promise<void> {
    const job = await this._exportJobRepo.findOne({ where: { id: jobId } });
    if (!job) return;

    try {
      this._logger.log(`Starting async export job ${jobId} for ${job.recordCount} records`);
      await this._exportJobRepo.update(jobId, { status: 'processing' });

      const system = await this._userRepo.findOne({ where: { username: 'SYSTEM' } });
      if (!system) throw new Error('SYSTEM user not found');

      const storedFilters: AuditReportsExportQueryDto = job.filters
        ? (JSON.parse(job.filters) as AuditReportsExportQueryDto)
        : {};

      const rows = await this._fetchAllAuditRows(storedFilters, system);
      const format = job.format ?? 'csv';
      const { buffer, filename } = await this._generateFile(rows, format);

      const mimeType = FileUtils.getMimeType(format);
      const file = FileUtils.createFileFromBuffer(buffer, filename, mimeType);

      const uploadResult = await this._storageService.uploadFile({
        file,
        folder: 'exports/reports/audit',
        fileName: filename,
      });

      // 7-day TTL for async exports so the user has time to retrieve via email
      const downloadUrl = await this._storageService.getSignedUrl(uploadResult.key, 604_800);
      const expiresAt = new Date(Date.now() + 604_800 * 1_000);

      await this._exportJobRepo.update(jobId, {
        status: 'completed',
        downloadUrl,
        expiresAt,
        recordCount: rows.length,
        completedAt: new Date(),
      });

      this._logger.log(
        `[AUDIT] Large-scale export COMPLETED: Job ${jobId} (${rows.length} records) ` +
          `for user ${user.id} (${user.email}). File uploaded to S3.`,
      );

      // Email notification — fire-and-forget, non-fatal if it fails
      try {
        this._logger.log(`Sending audit export ready email for job ${jobId} to ${user.email}`);
        // Send frontend URL pointing to Audit Trail Reports page WITH jobId
        const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const frontendDownloadUrl = `${frontendBaseUrl}/administrator/reports/audit-trail?jobId=${jobId}`;
        await this._emailService.sendAuditExportReadyEmail(user, frontendDownloadUrl, rows.length);
        this._logger.log(`Email sent successfully for job ${jobId}`);
      } catch (error: unknown) {
        this._logger.warn(
          `Audit export email failed for job ${jobId}: ${(error as Error).message}`,
        );
      }
    } catch (err) {
      this._logger.error(
        `Async export job ${jobId} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      this._logger.error(
        `[AUDIT] Large-scale export FAILED: Job ${jobId} for user ${user.id} (${user.email}). ` +
          `Error: ${(err as Error).message}`,
      );
      await this._exportJobRepo.update(jobId, {
        status: 'failed',
        errorMessage: (err as Error).message,
      });
    }
  }

  /** Fetch every matching audit row (no pagination) and transform to export shape. */
  private async _fetchAllAuditRows(
    filters: AuditReportsExportQueryDto,
    system: UserEntity,
  ): Promise<AuditExportRow[]> {
    const qb = this._auditTrailRepo
      .createQueryBuilder('auditTrail')
      .leftJoinAndSelect('auditTrail.user', 'user')
      .leftJoinAndSelect('user.userCompanies', 'userCompany')
      .leftJoinAndSelect('userCompany.company', 'company')
      .where('(auditTrail.userId IS NULL OR auditTrail.userId != :systemUserId)', {
        systemUserId: system.id,
      });

    this.applyAuditReportDateRangeFilters(qb, filters);
    if (filters.company) {
      qb.andWhere('company.name = :company', { company: filters.company });
    }
    qb.orderBy('auditTrail.timestamp', 'DESC');

    const trails = await qb.getMany();

    const userTypeLabelMap: Record<string, string> = {
      [USER_TYPE.ADMINISTRATOR]: 'LandTrax',
      [USER_TYPE.INDIVIDUAL]: 'Individual',
      [USER_TYPE.CORPORATE]: 'Corporate',
    };

    return trails.map((t): AuditExportRow => {
      let detailsMessage = t.details ?? '';
      try {
        if (t.details) {
          const parsed = JSON.parse(t.details) as { message?: string };
          detailsMessage = parsed.message ?? t.details;
        }
      } catch {
        // keep raw value
      }

      const userName = t.user
        ? `${t.user.firstName ?? ''} ${t.user.lastName ?? ''}`.trim()
        : 'Unknown';

      const userType = t.user ? (userTypeLabelMap[t.user.type] ?? t.user.type) : 'Unknown';

      const companyName =
        t.user?.userCompanies && t.user.userCompanies.length > 0
          ? (t.user.userCompanies[0].company?.name ?? '')
          : '';

      return {
        timestamp: t.timestamp.toISOString(),
        user: userName,
        userType,
        company: companyName,
        action: t.action ?? '',
        module: t.resource ?? '',
        status: t.status ?? '',
        details: detailsMessage,
      };
    });
  }

  /** Generate CSV or XLSX buffer + filename from export rows. */
  private async _generateFile(
    rows: AuditExportRow[],
    format: 'csv' | 'xlsx',
  ): Promise<{ buffer: Buffer; filename: string }> {
    const filename = FileUtils.generateExportFilename('AUDIT_TRAIL_REPORT', format);

    if (format === 'xlsx') {
      const buffer = await AuditXlsxGenerator.generate(rows);
      return { buffer, filename };
    }

    const csvString = AuditCsvGenerator.generate(rows);
    const buffer = Buffer.from(csvString, 'utf-8');
    return { buffer, filename };
  }

  // ─────────────────────────── Job Status / Retry ───────────────────────────

  async getExportJobStatus(
    jobId: string,
    userId: string,
  ): Promise<AuditExportJobStatusResponseDto> {
    const job = await this._exportJobRepo.findOne({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException('Export job not found');

    return {
      jobId: job.id,
      status: job.status,
      format: job.format,
      recordCount: job.recordCount,
      downloadUrl: job.downloadUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  async retryExportJob(jobId: string, user: UserEntity): Promise<AuditReportsExportResponseDto> {
    const job = await this._exportJobRepo.findOne({ where: { id: jobId, userId: user.id } });
    if (!job) throw new NotFoundException('Export job not found');

    if (job.status !== 'failed') {
      throw new BadRequestException('Only failed export jobs can be retried');
    }

    this._logger.log(
      `[AUDIT] Large-scale export RETRY requested: Job ${jobId} (${job.recordCount} records) ` +
        `by user ${user.id} (${user.email}). Checking rate limit...`,
    );

    // Retry does NOT create a new row — it reuses the existing job.
    // Re-check rate limit before restarting.

    const limitReached = await this._rateLimitService.isLimitReached();
    const remainingSlots = await this._rateLimitService.getRemainingSlots();

    if (limitReached) {
      this._logger.warn(
        `[AUDIT] Large-scale export RETRY REJECTED: Rate limit reached (3/hour). ` +
          `User ${user.id} (${user.email}) attempted to retry job ${jobId}.`,
      );
      throw new BadRequestException(
        'The maximum number of large scale audit log exports has been reached for the current hour. Please try again later.',
      );
    }

    this._logger.log(
      `[AUDIT] Large-scale export RETRY ACCEPTED: Job ${jobId} for user ${user.id} (${user.email}). ` +
        `Remaining slots: ${remainingSlots - 1}/3 (after this retry).`,
    );

    await this._exportJobRepo.update(jobId, {
      status: 'pending',
      errorMessage: null,
      downloadUrl: null,
      completedAt: null,
    });

    setImmediate(() => {
      void this._processAsyncExportJob(jobId, user);
    });

    return {
      isAsync: true,
      jobId,
      recordCount: job.recordCount ?? 0,
      message: 'Exporting in background...',
      statusCode: 202,
    };
  }

  // ─────────────────────────── Filter Options ───────────────────────────────

  /**
   * Returns all distinct action types in the audit trail, transformed to the
   * lowercase format returned by the reports API (e.g. 'login', 'create').
   */
  async getDistinctActions(): Promise<{ actions: string[] }> {
    const rawActions = await this._auditTrailRepo
      .createQueryBuilder('auditTrail')
      .select('DISTINCT auditTrail.action', 'action')
      .where('auditTrail.action IS NOT NULL')
      .getRawMany<{ action: string }>();

    const actionTypeMapping: Record<string, string> = {
      LOGIN: 'Login',
      LOGOUT: 'Logout',
      CREATE: 'Create',
      UPDATE: 'Update',
      DELETE: 'Delete',
      EXPORT: 'Export',
      IMPORT: 'Import',
      APPROVE: 'Approve',
      REJECT: 'Reject',
      ASSIGN: 'Assign',
      UNASSIGN: 'Unassign',
      VIEW: 'View',
      VIEWED: 'Viewed',
      DOWNLOAD: 'Download',
      UPLOAD: 'Upload',
      REGISTRATION: 'Registration',
    };

    const actions = [
      ...new Set(
        rawActions
          .map((row) => {
            const upper = row.action?.toUpperCase();
            if (!upper) return '';
            // Use mapping if available, otherwise capitalise first letter of each word
            return (
              actionTypeMapping[upper] ??
              row.action.replaceAll('_', ' ').replaceAll(/\b\w/g, (c: string) => c.toUpperCase())
            );
          })
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));

    return { actions };
  }

  /**
   * Returns all distinct entity/resource values present in the audit trail.
   */
  async getDistinctResources(): Promise<{ resources: string[] }> {
    const rawResources = await this._auditTrailRepo
      .createQueryBuilder('auditTrail')
      .select('DISTINCT auditTrail.resource', 'resource')
      .where('auditTrail.resource IS NOT NULL')
      .getRawMany<{ resource: string }>();

    const resources = [
      ...new Set(rawResources.map((row) => row.resource?.trim() ?? '').filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    return { resources };
  }
}
