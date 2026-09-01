import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectionStatus, CustomMeta, USER_TYPE } from 'src/shared/common';
import FeedbackEntity from 'src/shared/infrastructure/database/entities/feedback.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import { formatToUserDate } from 'src/utils/date-utils';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { TransactionReportsQueryDto } from '../dtos/transaction-reports-query.dto';
import { TransactionReportsResponseDto } from '../dtos/transaction-reports-response.dto';
import { CompanyScopeHelper } from './shared/company-scope-helper';

@Injectable()
export class TransactionReportsService {
  private readonly _logger = new Logger(TransactionReportsService.name);

  constructor(
    @InjectRepository(TransactionServiceEntity)
    private readonly _transactionServiceRepo: Repository<TransactionServiceEntity>,
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
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
      this._logger.error('Error:' + (error as Error)?.message, (error as Error)?.stack);
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 1 },
      } as any;
    }
  }
}
