import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectionStatus, CustomMeta, USER_TYPE } from 'src/shared/common';
import FeedbackEntity from 'src/shared/infrastructure/database/entities/feedback-entity';
import S3StorageService from 'src/modules/storage/s3-storage-service';
import { formatToUserDate } from 'src/utils/date-utils';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction-entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import { TransactionReportsExportQueryDto } from '../dtos/transaction-reports-export-query.dto';
import { TransactionReportsExportResponseDto } from '../dtos/transaction-reports-export-response.dto';
import { TransactionReportsQueryDto } from '../dtos/transaction-reports-query.dto';
import { TransactionReportsResponseDto } from '../dtos/transaction-reports-response.dto';
import { TransactionReportsSummaryQueryDto } from '../dtos/transaction-reports-summary-query.dto';
import { TransactionReportsSummaryResponseDto } from '../dtos/transaction-reports-summary-response.dto';
import { FileUtils } from '../../infrastructure/utils/file-utils';
import { CompanyScopeHelper } from './shared/company-scope-helper';

@Injectable()
export class TransactionReportsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly _transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionServiceEntity)
    private readonly _transactionServiceRepo: Repository<TransactionServiceEntity>,
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
    private readonly _storageService: S3StorageService,
    private readonly _companyScopeHelper: CompanyScopeHelper,
  ) {}

  async getTransactionReports(
    filters: TransactionReportsQueryDto,
  ): Promise<{ data: TransactionEntity[]; meta: CustomMeta }> {
    try {
      const queryBuilder = this._transactionServiceRepo
        .createQueryBuilder('ts')
        .select([
          't.id AS id',
          't.transactionNumber AS transactionNumber',
          's.name AS service',
          'ts.transactionServiceNumber AS transactionServiceNumber',
          'ts.client AS clientName',
          't.proposalReferenceNumber AS proposalReference',
          "CONCAT(u.firstName, ' ', u.lastName) AS requestor",
          'pst.name AS parentStatus',
          'st.name AS childStage',
          "CASE WHEN sts.name LIKE '%Verified%' THEN '--' ELSE sts.name END AS childStatus",
          'ts.notes AS rejectedDocumentNotes',
          'ISNULL(t.updatedDate, t.createdDate) AS lastModified',
          't.createdDate AS createdDate',
          'c.entityCode AS entityCode',
          'c.name AS companyName',
          "CONCAT(accountOwner.firstName, ' ', accountOwner.lastName) AS entityOwner",
          't.paymentStatus AS paymentStatus',
        ])
        .addSelect((subQuery) => {
          return subQuery
            .select('fb2.remarks')
            .from(FeedbackEntity, 'fb2')
            .where('fb2.transactionId = t.id')
            .andWhere("fb2.status = 'EOS REJECTED'")
            .orderBy('fb2.createdDate', 'DESC')
            .limit(1);
        }, 'rejectedEOSNotes')
        .addSelect(
          `(SELECT rod.Name FROM RegistryOfDeed rod WHERE rod.Id = t.RegistryOfDeedId)`,
          'registryOfDeedName',
        )
        .leftJoin('ts.transaction', 't')
        .leftJoin('t.staging', 'pst')
        .leftJoin('ts.staging', 'st')
        .leftJoin('ts.service', 's')
        .leftJoin('t.user', 'u')
        .leftJoin('u.userCompanies', 'uc')
        .leftJoin('uc.company', 'c')
        .leftJoin('c.entityCodeRecord', 'ec')
        .leftJoin('ec.accountOwner', 'accountOwner')
        .leftJoin('ts.stagingStatus', 'sts');

      queryBuilder.where('ts.deletedDate IS NULL');
      queryBuilder.andWhere("ISNULL(ts.IsEOS,0) = 0 AND ts.transactionServiceNumber <> 'eos'");
      queryBuilder.andWhere('t.deletedDate IS NULL');
      queryBuilder.andWhere("pst.code <> 'FOR_EOS_APPROVAL'");

      this.applyTransactionReportsFilters(queryBuilder, filters);
      this.applyTransactionReportsFilters2(queryBuilder, filters);
      this.applyTransactionReportsSorting(queryBuilder, filters);
      this.applyTransactionReportSearchFilters(queryBuilder, filters);
      this.applyTransactionReportDateRangeFilters(queryBuilder, filters);

      const totalCount = await queryBuilder.getCount();

      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);
      const offset = (page - 1) * limit;
      queryBuilder.offset(offset).limit(limit);

      const transactions = await queryBuilder.getRawMany();

      const data = transactions.map((record) => ({
        id: record.id,
        transactionNumber: record.transactionNumber,
        transactionServiceNumber: record.transactionServiceNumber,
        service: record.service,
        clientName: record.clientName,
        requestor: record.requestor,
        proposalReference: record.proposalReference,
        entityCode: record.entityCode,
        status: record.parentStatus,
        entityOwner: record.entityOwner ?? '--',
        lastModified: formatToUserDate(record.lastModified),
        createdDate: formatToUserDate(record.createdDate),
        rejectedDocumentNotes: record.rejectedDocumentNotes ?? '--',
        rejectedEOSNotes: record.rejectedEOSNotes ?? '--',
        companyName: record.companyName ?? '--',
        parentStatus: record.parentStatus,
        childStage: record.childStage,
        childStatus: record.childStatus,
        registryOfDeedName: record.registryOfDeedName ?? null,
        location: record.registryOfDeedName ?? null,
        paymentStatus: record.paymentStatus ?? '--',
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: data as any,
        meta: { total: totalCount, page, limit, totalPages },
      };
    } catch (error: unknown) {
      console.log('Transaction Reports Error: ', error);
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
      };
    }
  }

  applyTransactionReportSearchFieldSetter(
    queryBuilder: SelectQueryBuilder<any>,
    filters: TransactionReportsQueryDto,
  ): SelectQueryBuilder<any> {
    const isAliasInUse = (alias: string) =>
      queryBuilder.expressionMap.mainAlias?.name === alias ||
      queryBuilder.expressionMap.joinAttributes.some((j) => j.alias.name === alias);

    if (!isAliasInUse('ts')) queryBuilder.leftJoin('t.transactionServices', 'ts');
    if (!isAliasInUse('s')) queryBuilder.leftJoin('ts.service', 's');
    if (!isAliasInUse('u')) queryBuilder.leftJoin('t.user', 'u');
    if (!isAliasInUse('c')) {
      queryBuilder.leftJoin('u.userCompanies', 'uc');
      queryBuilder.leftJoin('uc.company', 'c');
    }
    if (!isAliasInUse('ec')) queryBuilder.leftJoin('c.entityCodeRecord', 'ec');
    if (!isAliasInUse('accountOwner')) queryBuilder.leftJoin('ec.accountOwner', 'accountOwner');
    if (!isAliasInUse('st')) queryBuilder.leftJoin('ts.staging', 'st');
    if (!isAliasInUse('pst')) queryBuilder.leftJoin('t.staging', 'pst');
    if (!isAliasInUse('sts')) queryBuilder.leftJoin('ts.stagingStatus', 'sts');

    return queryBuilder;
  }

  applyTransactionReportSearchFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filters: TransactionReportsQueryDto,
  ): SelectQueryBuilder<any> {
    if (filters.search) {
      this.applyTransactionReportSearchFieldSetter(queryBuilder, filters);

      queryBuilder.andWhere(
        '(s.name LIKE :search ' +
          'OR c.entityCode LIKE :search ' +
          'OR c.name LIKE :search ' +
          "OR CONCAT(accountOwner.firstName, ' ', accountOwner.lastName) LIKE :search " +
          'OR st.name LIKE :search ' +
          'OR pst.name LIKE :search ' +
          'OR sts.name LIKE :search ' +
          'OR t.transactionNumber LIKE :search ' +
          'OR ts.transactionServiceNumber LIKE :search ' +
          'OR ts.client LIKE :search ' +
          "OR CONCAT(u.firstName, ' ', u.lastName) LIKE :search " +
          'OR t.proposalReferenceNumber LIKE :search ' +
          'OR ts.notes LIKE :search ' +
          "OR (SELECT TOP 1 fb2.Remarks FROM Feedback fb2 WHERE fb2.TransactionId = t.Id AND fb2.Status = 'EOS REJECTED' ORDER BY fb2.CreatedDate DESC) LIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    return queryBuilder;
  }
  applyTransactionReportDateRangeFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filters: TransactionReportsQueryDto,
  ): SelectQueryBuilder<any> {
    const dateFrom = filters.dateFrom || null;
    let dateTo = filters.dateTo || null;

    if (dateFrom && !dateTo) {
      dateTo = new Date().toISOString().split('T')[0];
    }

    let dateToValue: Date | null = null;

    if (dateTo) {
      dateTo = `${dateTo} 23:59:59`;
      dateToValue = new Date(dateTo.replace(' ', 'T'));
    }

    if (dateFrom && dateToValue) {
      const dateFromValue = new Date(`${dateFrom}T00:00:00`);
      if (dateFromValue > dateToValue) {
        throw new BadRequestException('Start date cannot be after end date');
      }
    }

    if (dateFrom) {
      queryBuilder.andWhere('ISNULL(t.updatedDate, t.createdDate) >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('ISNULL(t.updatedDate, t.createdDate) <= :dateTo', {
        dateTo: dateTo,
      });
    }

    return queryBuilder;
  }
  applyTransactionReportsFilters2(
    queryBuilder: SelectQueryBuilder<any>,
    filters: TransactionReportsQueryDto,
  ): SelectQueryBuilder<any> {
    if (filters.location) {
      const locationArray = filters.location.split(',').map((l) => l.trim());
      if (locationArray.length > 0) {
        // Use a subquery since there's no ORM relation - join RegistryOfDeed by raw column
        queryBuilder.andWhere(
          `t.RegistryOfDeedId IN (SELECT rod_f.Id FROM RegistryOfDeed rod_f WHERE rod_f.Name IN (:...locations))`,
          { locations: locationArray },
        );
      }
    }

    if (filters.statuses) {
      const statusArray = filters.statuses.split(',').map((s) => s.trim());
      if (statusArray.length > 0) {
        queryBuilder.andWhere('pst.code IN (:...statuses)', { statuses: statusArray });
      }
    }

    if (filters.type) {
      const typeMapping = {
        title_search: ['B2B_SS_WO_PO'],
        due_diligence: ['B2B_SS_W_PO'],
        legal: ['B2B_ASS_W_PO'],
        valuation: [],
        other: ['B2C'],
      };
      const dbTypes = typeMapping[filters.type] || [];
      if (dbTypes.length > 0) {
        queryBuilder.andWhere('t.type IN (:...types)', { types: dbTypes });
      }
    }

    this._applyUserTypeFilter(queryBuilder, filters.userType);

    return queryBuilder;
  }

  applyTransactionReportsFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filters: TransactionReportsQueryDto,
  ): SelectQueryBuilder<any> {
    if (filters.transactionNumber) {
      queryBuilder.andWhere('t.transactionNumber LIKE :transactionNumber', {
        transactionNumber: `%${filters.transactionNumber}%`,
      });
    }

    if (filters.transactionServiceNumber) {
      queryBuilder.andWhere('ts.transactionServiceNumber LIKE :transactionServiceNumber', {
        transactionServiceNumber: `%${filters.transactionServiceNumber}%`,
      });
    }

    if (filters.entityCode) {
      queryBuilder.andWhere('c.entityCode LIKE :entityCode', {
        entityCode: `%${filters.entityCode}%`,
      });
    }

    if (filters.entityOwner) {
      queryBuilder.andWhere(
        "CONCAT(accountOwner.firstName, ' ', accountOwner.lastName) LIKE :entityOwner",
        { entityOwner: `%${filters.entityOwner}%` },
      );
    }

    if (filters.clientName) {
      queryBuilder.andWhere('ts.client LIKE :clientName', {
        clientName: `%${filters.clientName}%`,
      });
    }

    if (filters.requestor) {
      const isAliasInUse = (alias: string) =>
        queryBuilder.expressionMap.mainAlias?.name === alias ||
        queryBuilder.expressionMap.joinAttributes.some((j) => j.alias.name === alias);

      if (!isAliasInUse('u')) queryBuilder.leftJoin('t.user', 'u');
      queryBuilder.andWhere(
        "(CONCAT(u.firstName, ' ', u.lastName) LIKE :requestor OR u.email LIKE :requestor)",
        { requestor: `%${filters.requestor}%` },
      );
    }

    if (filters.proposalRef) {
      queryBuilder.andWhere('t.proposalReferenceNumber LIKE :proposalRef', {
        proposalRef: `%${filters.proposalRef}%`,
      });
    }

    return queryBuilder;
  }

  private _applyUserTypeFilter(queryBuilder: SelectQueryBuilder<any>, userType?: string): void {
    if (!userType) return;

    // Map frontend filter values to USER_TYPE enum values
    // Filter directly on user.type field instead of role relationships
    const userTypeMap: Record<string, USER_TYPE> = {
      Individual: USER_TYPE.INDIVIDUAL,
      Corporate: USER_TYPE.CORPORATE,
    };

    const mappedUserType = userTypeMap[userType];
    if (!mappedUserType) return;

    // Filter on the user's type field directly (using alias 'u' from the query)
    queryBuilder.andWhere('u.type = :userType', { userType: mappedUserType });
  }

  applyTransactionReportsSorting(
    queryBuilder: SelectQueryBuilder<any>,
    filters: TransactionReportsQueryDto,
  ): SelectQueryBuilder<any> {
    const sortBy = filters.sortBy || 'transactionNumber';
    const sortDirection = filters.sortDirection || 'desc';
    const sortMapping = {
      company: 'c.name',
      transactionNumber: 't.transactionNumber',
      transactionServiceNumber: 'ts.transactionServiceNumber',
      service: 's.name',
      clientName: 'ts.client',
      proposalReference: 't.proposalReferenceNumber',
      requestor: 'requestor',
      status: 'pst.name',
      childStage: 'st.name',
      childStatus: 'sts.name',
      notesRejectedEOS: 'rejectedEOSNotes',
      notesRejectedDocument: 'ts.notes',
      lastModified: 'ISNULL(t.updatedDate, t.createdDate)',
      createdDate: 't.createdDate',
      paymentStatus: 't.paymentStatus',
    };
    const dbColumn = sortMapping[sortBy] || 't.transactionNumber';
    queryBuilder.orderBy(dbColumn, sortDirection.toUpperCase() as 'ASC' | 'DESC');
    return queryBuilder;
  }

  async getTransactionReportsSummary(
    filters: TransactionReportsSummaryQueryDto,
    userId?: string,
  ): Promise<TransactionReportsSummaryResponseDto> {
    try {
      let scopedUserIds: string[] | null = null;
      if (userId) {
        scopedUserIds = await this._companyScopeHelper.getCompanyUserIds(userId);
        if (scopedUserIds.length === 0) {
          return this.calculateTransactionSummary([]);
        }
      }

      let queryBuilder = this._transactionServiceRepo
        .createQueryBuilder('ts')
        .leftJoinAndSelect('ts.transaction', 't')
        .leftJoinAndSelect('t.staging', 'pst')
        .leftJoinAndSelect('ts.staging', 'st')
        .leftJoinAndSelect('ts.service', 's')
        .leftJoinAndSelect('t.user', 'u')
        .leftJoinAndSelect('ts.stagingStatus', 'sts')
        .where('ts.deletedDate IS NULL')
        .andWhere("ISNULL(ts.IsEOS,0) = 0 AND ts.transactionServiceNumber <> 'eos'")
        .andWhere('t.deletedDate IS NULL')
        .andWhere("pst.code <> 'FOR_EOS_APPROVAL'");

      if (scopedUserIds) {
        queryBuilder.andWhere('t.userId IN (:...userIds)', { userIds: scopedUserIds });
      }

      queryBuilder = this.applyTransactionReportsFilters(queryBuilder, filters);
      queryBuilder = this.applyTransactionReportsFilters2(queryBuilder, filters);
      const services = await queryBuilder.getMany();

      return this.calculateTransactionSummary(services);
    } catch (error) {
      console.error(`Error generating transaction reports summary: ${(error as Error).message}`);
      return this.calculateTransactionSummary([]);
    }
  }

  async getClientTransactionReports(
    filters: TransactionReportsQueryDto,
    userId: string,
  ): Promise<TransactionReportsResponseDto> {
    try {
      const user = await this._userRepo.findOne({ where: { id: userId, deletedDate: IsNull() } });
      if (!user) {
        return {
          data: [],
          meta: { total: 0, page: 1, limit: 25, totalPages: 0 },
        };
      }

      const scopedUserIds = await this._companyScopeHelper.getCompanyUserIds(userId);
      if (user?.type === USER_TYPE.CORPORATE && scopedUserIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page: 1, limit: 25, totalPages: 0 },
        };
      }

      const queryBuilder = this._transactionServiceRepo
        .createQueryBuilder('ts')
        .select([
          't.id AS id',
          't.transactionNumber AS transactionNumber',
          's.name AS service',
          'ts.transactionServiceNumber AS transactionServiceNumber',
          'ts.client AS clientName',
          't.proposalReferenceNumber AS proposalReference',
          "CONCAT(u.firstName, ' ', u.lastName) AS requestor",
          'pst.name AS parentStatus',
          'st.name AS childStage',
          "CASE WHEN sts.name LIKE '%Verified%' THEN '--' ELSE sts.name END AS childStatus",
          'ts.notes AS rejectedDocumentNotes',
          'ISNULL(t.updatedDate, t.createdDate) AS lastModified',
          't.createdDate AS createdDate',
          'c.entityCode AS entityCode',
          'c.name AS companyName',
          "CONCAT(accountOwner.firstName, ' ', accountOwner.lastName) AS entityOwner",
          `ISNULL(t.paymentStatus, '${CollectionStatus.PENDING}') AS paymentStatus`,
        ])
        .addSelect((subQuery) => {
          return subQuery
            .select('fb2.remarks')
            .from(FeedbackEntity, 'fb2')
            .where('fb2.transactionId = t.id')
            .andWhere("fb2.status = 'EOS REJECTED'")
            .orderBy('fb2.createdDate', 'DESC')
            .limit(1);
        }, 'rejectedEOSNotes')
        .addSelect(
          `(SELECT rod.Name FROM RegistryOfDeed rod WHERE rod.Id = t.RegistryOfDeedId)`,
          'registryOfDeedName',
        )
        .leftJoin('ts.transaction', 't')
        .leftJoin('t.staging', 'pst')
        .leftJoin('ts.staging', 'st')
        .leftJoin('ts.service', 's')
        .leftJoin('t.user', 'u')
        .leftJoin('u.userCompanies', 'uc')
        .leftJoin('uc.company', 'c')
        .leftJoin('c.entityCodeRecord', 'ec')
        .leftJoin('ec.accountOwner', 'accountOwner')
        .leftJoin('ts.stagingStatus', 'sts');

      queryBuilder.where('ts.deletedDate IS NULL');
      queryBuilder.andWhere("ISNULL(ts.IsEOS,0) = 0 AND ts.transactionServiceNumber <> 'eos'");
      queryBuilder.andWhere('t.deletedDate IS NULL');
      queryBuilder.andWhere("pst.code <> 'FOR_EOS_APPROVAL'");

      if (user?.type === USER_TYPE.CORPORATE) {
        queryBuilder.andWhere('t.userId IN (:...userIds)', { userIds: scopedUserIds });
      } else {
        queryBuilder.andWhere('t.userId =:userId', { userId });
      }

      this.applyTransactionReportsFilters(queryBuilder, filters);
      this.applyTransactionReportsFilters2(queryBuilder, filters);
      this.applyTransactionReportsSorting(queryBuilder, filters);
      this.applyTransactionReportSearchFilters(queryBuilder, filters);
      this.applyTransactionReportDateRangeFilters(queryBuilder, filters);

      const totalCount = await queryBuilder.getCount();
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);
      const offset = (page - 1) * limit;
      queryBuilder.offset(offset).limit(limit);

      const transactions = await queryBuilder.getRawMany();

      const data = transactions.map((record) => ({
        id: record.id,
        transactionNumber: record.transactionNumber,
        transactionServiceNumber: record.transactionServiceNumber,
        service: record.service,
        clientName: record.clientName,
        requestor: record.requestor,
        proposalReference: record.proposalReference,
        entityCode: record.entityCode,
        status: record.parentStatus,
        entityOwner: record.entityOwner ?? '--',
        lastModified: formatToUserDate(record.lastModified),
        createdDate: formatToUserDate(record.createdDate),
        rejectedDocumentNotes: record.rejectedDocumentNotes ?? '--',
        rejectedEOSNotes: record.rejectedEOSNotes ?? '--',
        companyName: record.companyName ?? '--',
        parentStatus: record.parentStatus,
        childStage: record.childStage,
        childStatus: record.childStatus,
        registryOfDeedName: record.registryOfDeedName ?? null,
        location: record.registryOfDeedName ?? null,
        paymentStatus: record.paymentStatus ?? '--',
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: data as any,
        meta: { total: totalCount, page, limit, totalPages },
      };
    } catch (error: unknown) {
      console.log('Client Transaction Reports Error: ', error);
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
      } as any;
    }
  }

  async exportTransactionReports(
    filters: TransactionReportsExportQueryDto,
    userId?: string,
  ): Promise<TransactionReportsExportResponseDto> {
    try {
      let data: any[];
      let summary: TransactionReportsSummaryResponseDto;

      if (userId) {
        const scopedUserIds = await this._companyScopeHelper.getCompanyUserIds(userId);
        if (scopedUserIds.length === 0) {
          data = [];
          summary = this.calculateTransactionSummary([]);
        } else {
          const queryBuilder = this._transactionServiceRepo
            .createQueryBuilder('ts')
            .select([
              't.id AS id',
              't.transactionNumber AS transactionNumber',
              's.name AS service',
              'ts.transactionServiceNumber AS transactionServiceNumber',
              'ts.client AS clientName',
              't.proposalReferenceNumber AS proposalReference',
              "CONCAT(u.firstName, ' ', u.lastName) AS requestor",
              'pst.name AS parentStatus',
              'st.name AS childStage',
              'sts.name AS childStatus',
              'ISNULL(t.updatedDate, t.createdDate) AS lastModified',
              't.createdDate AS createdDate',
            ])
            .leftJoin('ts.transaction', 't')
            .leftJoin('t.staging', 'pst')
            .leftJoin('ts.staging', 'st')
            .leftJoin('ts.service', 's')
            .leftJoin('t.user', 'u')
            .leftJoin('ts.stagingStatus', 'sts');

          queryBuilder.where('ts.deletedDate IS NULL');
          queryBuilder.andWhere("ISNULL(ts.IsEOS,0) = 0 AND ts.transactionServiceNumber <> 'eos'");
          queryBuilder.andWhere('t.deletedDate IS NULL');
          queryBuilder.andWhere("pst.code <> 'FOR_EOS_APPROVAL'");
          queryBuilder.andWhere('t.userId IN (:...userIds)', { userIds: scopedUserIds });

          const exportFilters = { ...filters, page: undefined, limit: undefined };
          this.applyTransactionReportsFilters(queryBuilder, exportFilters);
          this.applyTransactionReportsFilters2(queryBuilder, filters);
          this.applyTransactionReportsSorting(queryBuilder, exportFilters);

          const rawTransactions = await queryBuilder.getRawMany();
          data = rawTransactions.map((record) => ({
            ...record,
            lastModified: formatToUserDate(record.lastModified),
            createdDate: formatToUserDate(record.createdDate),
          }));

          const summaryFilters = { ...filters };
          delete (summaryFilters as any).format;
          summary = await this.getTransactionReportsSummary(summaryFilters as any, userId);
        }
      } else {
        const exportFilters = { ...filters, page: undefined, limit: undefined };
        const result = await this.getTransactionReports(exportFilters as any);
        data = result.data;
        const summaryFilters = { ...filters };
        delete (summaryFilters as any).format;
        summary = await this.getTransactionReportsSummary(summaryFilters);
      }

      let fileContent: string | Buffer;
      let filename: string;

      if (filters.format === 'xlsx') {
        fileContent = await this.generateTransactionXlsx(data, summary);
        filename = FileUtils.generateExportFilename('transaction-reports', 'xlsx');
      } else {
        fileContent = await this.generateTransactionCsv(data, summary);
        filename = FileUtils.generateExportFilename('transaction-reports', 'csv');
      }

      const mimeType = FileUtils.getMimeType(filters.format || 'csv');
      const file = FileUtils.createFileFromBuffer(
        Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, 'utf-8'),
        filename,
        mimeType,
      );

      const uploadResult = await this._storageService.uploadFile({
        file,
        folder: 'exports/reports/transactions',
        fileName: filename,
      });

      const signedUrl = await this._storageService.getSignedUrl(uploadResult.key, 86400);

      return {
        downloadUrl: signedUrl,
        message: `Transaction reports exported successfully as ${filters.format?.toUpperCase() || 'CSV'}`,
        statusCode: 200,
      };
    } catch (error: unknown) {
      console.error('Error exporting transaction reports:', error);
      return {
        message: `Failed to export transaction reports: ${(error as Error).message}`,
        statusCode: 500,
      };
    }
  }

  calculateTransactionSummary(
    services: TransactionServiceEntity[],
  ): TransactionReportsSummaryResponseDto {
    const statusStats = {
      draft: { count: 0 },
      pending: { count: 0 },
      in_progress: { count: 0 },
      completed: { count: 0 },
      cancelled: { count: 0 },
      on_hold: { count: 0 },
    };

    const typeStats = new Map<string, { count: number }>();
    const priorityStats = {
      low: { count: 0 },
      normal: { count: 0 },
      high: { count: 0 },
      urgent: { count: 0 },
    };

    let totalEstimatedValue = 0;
    let totalActualValue = 0;
    const totalCount = services.length;

    services.forEach((service) => {
      const transaction = service.transaction;
      if (!transaction) return;

      const statusMapping = {
        DRAFT: 'draft',
        FOR_SALES_REVIEW: 'pending',
        VERIFIED: 'pending',
        FOR_DOCUMENT_REVIEW_PARENT: 'pending',
        FOR_DOCUMENT_REVIEW_CHILD: 'pending',
        VALIDATED: 'pending',
        IN_PROCESS: 'in_progress',
        BIR: 'in_progress',
        RD: 'in_progress',
        LGU_ASSESSOR: 'in_progress',
        LGU_TREASURER: 'in_progress',
        LTO: 'in_progress',
        LANDTRAX: 'in_progress',
        READY_FOR_RELEASE: 'in_progress',
        OUT_FOR_DELIVERY: 'in_progress',
        DELIVERED: 'completed',
        PICKED_UP_BY_CLIENT: 'completed',
        CLOSED: 'completed',
        REJECTED: 'cancelled',
        CANCELED: 'cancelled',
        ON_HOLD: 'on_hold',
        FOR_CLIENT_RESUBMISSION: 'pending',
      };

      const apiStatus = statusMapping[transaction?.staging?.code || ''] || 'pending';
      statusStats[apiStatus].count++;

      const typeMapping = {
        B2C: 'other',
        B2B_SS_WO_PO: 'title_search',
        B2B_SS_W_PO: 'due_diligence',
        B2B_ASS_W_PO: 'legal',
      };
      const transactionType = typeMapping[transaction.type] || 'other';
      const typeStat = typeStats.get(transactionType) || { count: 0 };
      typeStat.count++;
      typeStats.set(transactionType, typeStat);

      const priority = this.calculateTransactionPriority(transaction);
      priorityStats[priority].count++;

      const price = service.serviceFee ?? service.service?.price ?? 0;
      const quantity = service.quantity ?? 1;
      const gross = price * quantity;
      const discount = service.discount ?? 0;
      const net = gross - gross * (discount / 100);

      totalEstimatedValue += net;
      totalActualValue += net + net * 0.12;
    });

    const statusBreakdown = Object.entries(statusStats).map(([status, data]) => ({
      status,
      count: data.count,
      percentage: totalCount > 0 ? Number(((data.count / totalCount) * 100).toFixed(2)) : 0,
    }));

    const typeBreakdown = Array.from(typeStats.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: totalCount > 0 ? Number(((data.count / totalCount) * 100).toFixed(2)) : 0,
    }));

    const priorityBreakdown = Object.entries(priorityStats).map(([priority, data]) => ({
      priority,
      count: data.count,
      percentage: totalCount > 0 ? Number(((data.count / totalCount) * 100).toFixed(2)) : 0,
    }));

    const monthlyTrend = this.calculateMonthlyTrend(services);
    const { averageCompletionTime, completionRate } = this.calculateCompletionMetrics(services);

    return {
      totalCount,
      draftCount: statusStats.draft.count,
      pendingCount: statusStats.pending.count,
      inProgressCount: statusStats.in_progress.count,
      completedCount: statusStats.completed.count,
      cancelledCount: statusStats.cancelled.count,
      onHoldCount: statusStats.on_hold.count,
      statusBreakdown,
      typeBreakdown,
      priorityBreakdown,
      monthlyTrend,
      averageCompletionTime: Number(averageCompletionTime.toFixed(2)),
      completionRate: Number(completionRate.toFixed(2)),
      totalEstimatedValue: Number(totalEstimatedValue.toFixed(2)),
      totalActualValue: Number(totalActualValue.toFixed(2)),
    };
  }

  private calculateTransactionPriority(
    transaction: TransactionEntity,
  ): 'low' | 'normal' | 'high' | 'urgent' {
    const tat = transaction.tat;
    if (!tat) return 'normal';
    if (tat <= 1) return 'urgent';
    if (tat <= 3) return 'high';
    if (tat <= 7) return 'normal';
    return 'low';
  }

  private calculateMonthlyTrend(
    services: TransactionServiceEntity[],
  ): Array<{ month: string; count: number; completedCount: number }> {
    const monthlyData = new Map<string, { count: number; completed: number }>();

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyData.set(monthKey, { count: 0, completed: 0 });
    }

    services.forEach((service) => {
      const transaction = service.transaction;
      if (!transaction) return;
      const monthKey = transaction.createdDate.toISOString().slice(0, 7);
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey)!;
        data.count++;
        if (transaction.completedAt) data.completed++;
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      completedCount: data.completed,
    }));
  }

  private calculateCompletionMetrics(services: TransactionServiceEntity[]): {
    averageCompletionTime: number;
    completionRate: number;
  } {
    const completedTransactions = services.map((s) => s.transaction).filter((t) => t?.completedAt);
    const totalTransactions = services.length;

    const completionTimes = [];

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

    const completionRate =
      totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

    return { averageCompletionTime, completionRate };
  }

  private async generateTransactionCsv(
    data: any[],
    summary: TransactionReportsSummaryResponseDto,
  ): Promise<string> {
    const rows = data.map((item) => ({
      'Transaction Number': item.transactionNumber,
      Service: item.service,
      'Transaction Service Number': item.transactionServiceNumber,
      'Client Name': item.clientName,
      'Proposal Reference': item.proposalReference,
      Requestor: item.requestor,
      'Parent Status': item.parentStatus,
      'Child Stage': item.childStage,
      'Child Status': item.childStatus,
      'Last Modified': item.lastModified,
      'Created Date': item.createdDate,
    }));

    rows.push({} as any);

    const parser = new (await import('json2csv')).Parser({
      fields: [
        'Transaction Number',
        'Service',
        'Transaction Service Number',
        'Client Name',
        'Proposal Reference',
        'Requestor',
        'Parent Status',
        'Child Stage',
        'Child Status',
        'Last Modified',
        'Created Date',
      ],
      header: true,
    });

    return parser.parse(rows);
  }

  private async generateTransactionXlsx(
    data: any[],
    summary: TransactionReportsSummaryResponseDto,
  ): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const dataWorksheet = workbook.addWorksheet('Transaction Reports');

    dataWorksheet.columns = [
      { header: 'Transaction Number', key: 'transactionNumber', width: 20 },
      { header: 'Service', key: 'service', width: 25 },
      { header: 'Transaction Service Number', key: 'transactionServiceNumber', width: 25 },
      { header: 'Client Name', key: 'clientName', width: 30 },
      { header: 'Proposal Reference', key: 'proposalReference', width: 20 },
      { header: 'Requestor', key: 'requestor', width: 25 },
      { header: 'Parent Status', key: 'parentStatus', width: 20 },
      { header: 'Child Stage', key: 'childStage', width: 20 },
      { header: 'Child Status', key: 'childStatus', width: 20 },
      { header: 'Last Modified', key: 'lastModified', width: 20 },
      { header: 'Created Date', key: 'createdDate', width: 20 },
    ];

    data.forEach((item) => dataWorksheet.addRow(item));

    const summaryWorksheet = workbook.addWorksheet('Summary');
    summaryWorksheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    summaryWorksheet.addRow({ metric: 'Total Count', value: summary.totalCount });
    summaryWorksheet.addRow({ metric: 'Draft Count', value: summary.draftCount });
    summaryWorksheet.addRow({ metric: 'Pending Count', value: summary.pendingCount });
    summaryWorksheet.addRow({ metric: 'In Progress Count', value: summary.inProgressCount });
    summaryWorksheet.addRow({ metric: 'Completed Count', value: summary.completedCount });
    summaryWorksheet.addRow({ metric: 'Cancelled Count', value: summary.cancelledCount });
    summaryWorksheet.addRow({ metric: 'On Hold Count', value: summary.onHoldCount });
    summaryWorksheet.addRow({
      metric: 'Average Completion Time (Days)',
      value: summary.averageCompletionTime,
    });
    summaryWorksheet.addRow({ metric: 'Completion Rate (%)', value: summary.completionRate });
    summaryWorksheet.addRow({
      metric: 'Total Estimated Value',
      value: summary.totalEstimatedValue,
    });
    summaryWorksheet.addRow({ metric: 'Total Actual Value', value: summary.totalActualValue });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
