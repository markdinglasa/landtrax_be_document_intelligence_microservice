import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomMeta } from 'src/shared/common';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import { Repository } from 'typeorm';

import { AuditReportsExportQueryDto } from '../dtos/audit-reports-export-query.dto';
import {
    AuditExportJobStatusResponseDto,
    AuditReportsExportResponseDto,
} from '../dtos/audit-reports-export-response.dto';
import { AuditReportsQueryDto } from '../dtos/audit-reports-query.dto';
import { AuditReportsResponseDto } from '../dtos/audit-reports-response.dto';
import { CollectionsReportsExportQueryDto } from '../dtos/collections-reports-export-query.dto';
import { CollectionsReportsExportResponseDto } from '../dtos/collections-reports-export-response.dto';
import { CollectionsReportsQueryDto } from '../dtos/collections-reports-query.dto';
import { CollectionsReportsSummaryQueryDto } from '../dtos/collections-reports-summary-query.dto';
import { CollectionsReportsSummaryResponseDto } from '../dtos/collections-reports-summary-response.dto';
import { CourierReportItemDto } from '../dtos/courier-report-item.dto';
import { CourierReportsQueryDto } from '../dtos/courier-reports-query.dto';
import { DocumentReportsQueryDto } from '../dtos/document-reports-query.dto';
import { DocumentReportsResponseDto } from '../dtos/document-reports-response.dto';
import { EntityCodeReportsQueryDto } from '../dtos/entity-code-reports-query.dto';
import { EntityCodeReportsResponseDto } from '../dtos/entity-code-reports-response.dto';
import { ServiceCatalogReportsQueryDto } from '../dtos/service-catalog-reports-query.dto';
import { ServiceCatalogReportsResponseDto } from '../dtos/service-catalog-reports-response.dto';
import { TransactionReportsExportQueryDto } from '../dtos/transaction-reports-export-query.dto';
import { TransactionReportsExportResponseDto } from '../dtos/transaction-reports-export-response.dto';
import { TransactionReportsQueryDto } from '../dtos/transaction-reports-query.dto';
import { TransactionReportsResponseDto } from '../dtos/transaction-reports-response.dto';
import { TransactionReportsSummaryQueryDto } from '../dtos/transaction-reports-summary-query.dto';
import { TransactionReportsSummaryResponseDto } from '../dtos/transaction-reports-summary-response.dto';
import { UserReportsQueryDto } from '../dtos/user-reports-query.dto';
import { UserReportsSummaryQueryDto } from '../dtos/user-reports-summary-query.dto';
import { AuditReportsService } from './audit-reports-service';
import { CollectionsReportsService } from './collections-reports-service';
import { CourierReportsService } from './courier-reports-service';
import { DocumentReportsService } from './document-reports-service';
import { EntityCodeReportsService } from './entity-code-reports-service';
import { ServiceCatalogReportsService } from './service-catalog-reports-service';
import { TransactionReportsService } from './transaction-reports-service';
import { UserReportsService } from './user-reports-service';

/**
 * ReportsService — thin facade that delegates all calls to domain-specific services.
 * Kept for backward compatibility with existing controllers.
 */
@Injectable()
export default class ReportsService {
  private readonly _logger = new Logger(ReportsService.name);

  constructor(
    private readonly courierReportsService: CourierReportsService,
    private readonly collectionsReportsService: CollectionsReportsService,
    private readonly transactionReportsService: TransactionReportsService,
    private readonly auditReportsService: AuditReportsService,
    private readonly documentReportsService: DocumentReportsService,
    private readonly userReportsService: UserReportsService,
    private readonly entityCodeReportsService: EntityCodeReportsService,
    private readonly serviceCatalogReportsService: ServiceCatalogReportsService,
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
  ) {}

  /** Helper used by controllers to resolve the requesting UserEntity by id */
  async findUserById(userId: string): Promise<UserEntity | null> {
    return this._userRepo.findOne({ where: { id: userId } });
  }

  // ─────────────────────────── Courier ──────────────────────────────────────
  async getCourierReports(
    userId: string,
    filters: CourierReportsQueryDto,
  ): Promise<{ data: CourierReportItemDto[]; meta: CustomMeta }> {
    return this.courierReportsService.getCourierReports(userId, filters);
  }

  // ─────────────────────────── Collections ──────────────────────────────────
  async getCollectionsReports(
    filters: CollectionsReportsQueryDto,
    userId: string,
  ): Promise<{ data: any[]; meta: CustomMeta }> {
    return this.collectionsReportsService.getCollectionsReports(filters, userId);
  }

  async getCollectionsReportsSummary(
    filters: CollectionsReportsSummaryQueryDto,
  ): Promise<CollectionsReportsSummaryResponseDto> {
    return this.collectionsReportsService.getCollectionsReportsSummary(filters);
  }

  async exportCollectionsReports(
    filters: CollectionsReportsExportQueryDto,
  ): Promise<CollectionsReportsExportResponseDto> {
    return this.collectionsReportsService.exportCollectionsReports(filters);
  }

  // ─────────────────────────── Transactions ─────────────────────────────────
  async getTransactionReports(
    filters: TransactionReportsQueryDto,
  ): Promise<{ data: TransactionEntity[]; meta: CustomMeta }> {
    return this.transactionReportsService.getTransactionReports(filters);
  }

  async getTransactionReportsSummary(
    filters: TransactionReportsSummaryQueryDto,
    userId?: string,
  ): Promise<TransactionReportsSummaryResponseDto> {
    return this.transactionReportsService.getTransactionReportsSummary(filters, userId);
  }

  async getClientTransactionReports(
    filters: TransactionReportsQueryDto,
    userId: string,
  ): Promise<TransactionReportsResponseDto> {
    return this.transactionReportsService.getClientTransactionReports(filters, userId);
  }

  async exportTransactionReports(
    filters: TransactionReportsExportQueryDto,
    userId?: string,
  ): Promise<TransactionReportsExportResponseDto> {
    return this.transactionReportsService.exportTransactionReports(filters, userId);
  }

  // ─────────────────────────── Audit ────────────────────────────────────────
  async getAuditReports(filters: AuditReportsQueryDto): Promise<AuditReportsResponseDto> {
    return this.auditReportsService.getAuditReports(filters);
  }

  async exportAuditReports(
    filters: AuditReportsExportQueryDto,
    user: UserEntity,
  ): Promise<AuditReportsExportResponseDto> {
    return this.auditReportsService.exportAuditReports(filters, user);
  }

  async getAuditExportJobStatus(
    jobId: string,
    userId: string,
  ): Promise<AuditExportJobStatusResponseDto> {
    return this.auditReportsService.getExportJobStatus(jobId, userId);
  }

  async retryAuditExportJob(
    jobId: string,
    user: UserEntity,
  ): Promise<AuditReportsExportResponseDto> {
    return this.auditReportsService.retryExportJob(jobId, user);
  }

  async getAuditReportActions(): Promise<{ actions: string[] }> {
    return this.auditReportsService.getDistinctActions();
  }

  async getAuditReportResources(): Promise<{ resources: string[] }> {
    return this.auditReportsService.getDistinctResources();
  }

  // ─────────────────────────── Documents ────────────────────────────────────
  async getDocumentReports(filters: DocumentReportsQueryDto): Promise<DocumentReportsResponseDto> {
    return this.documentReportsService.getDocumentReports(filters);
  }

  async getClientDocumentReports(
    filters: DocumentReportsQueryDto,
    userId: string,
  ): Promise<DocumentReportsResponseDto> {
    return this.documentReportsService.getClientDocumentReports(filters, userId);
  }

  // ─────────────────────────── Users ────────────────────────────────────────
  async getUserReports(
    filters: UserReportsQueryDto,
  ): Promise<{ data: UserEntity[]; meta: CustomMeta }> {
    return this.userReportsService.getUserReports(filters);
  }

  async getUserReportsSummary(filters: UserReportsSummaryQueryDto, userId?: string): Promise<any> {
    return this.userReportsService.getUserReportsSummary(filters, userId);
  }

  async getClientUserReports(
    filters: UserReportsQueryDto,
    userId: string,
  ): Promise<{ data: UserEntity[]; meta: CustomMeta }> {
    return this.userReportsService.getClientUserReports(filters, userId);
  }

  // ─────────────────────────── Entity Code ──────────────────────────────────
  async getEntityCodeReports(
    filters: EntityCodeReportsQueryDto,
  ): Promise<EntityCodeReportsResponseDto> {
    return this.entityCodeReportsService.getEntityCodeReports(filters);
  }

  // ─────────────────────────── Service Catalog ──────────────────────────────
  async getServiceCatalogReports(
    filters: ServiceCatalogReportsQueryDto,
  ): Promise<ServiceCatalogReportsResponseDto> {
    return this.serviceCatalogReportsService.getServiceCatalogReports(filters);
  }
}
