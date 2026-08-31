import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity';
import RegistryOfDeedEntity from 'src/shared/infrastructure/database/entities/location';
import StagingStatusEntity from 'src/shared/infrastructure/database/entities/staging-status.entity';
import StagingEntity from 'src/shared/infrastructure/database/entities/staging.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import { formatToUserDate } from 'src/utils/date-utils';
import { Repository } from 'typeorm';
import { DateRange } from '../../domain/types';
import { DashboardHelperService } from './dashboard-helper-service';

@Injectable()
export class DashboardSummaryService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TransactionServiceEntity)
    private readonly transactionServiceRepo: Repository<TransactionServiceEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepo: Repository<CollectionEntity>,
    @InjectRepository(StagingEntity)
    private readonly stagingRepo: Repository<StagingEntity>,
    private readonly dashboardHelperService: DashboardHelperService,
  ) {}

  async widgetTransactions({
    userId,
    range,
    type,
    isAdmin,
    companyId,
    userType,
  }: {
    userId?: string;
    range?: DateRange;
    type?: string;
    isAdmin?: boolean;
    companyId?: string;
    userType?: string;
  }) {
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin,
      companyId,
      userType,
    });

    const query = this.transactionServiceRepo
      .createQueryBuilder('ts')
      .select([
        'c.name AS companyName',
        't.transactionNumber AS transactionNumber',
        's.name AS service',
        'ts.transactionServiceNumber AS transactionServiceNumber',
        'ts.client AS clientName',
        't.proposalReferenceNumber AS proposalReference',
        "CONCAT(u.firstName, ' ', u.lastName) AS requestor",
        //'c.entityCode AS entityCode',
        't.type AS type',
        'pst.name AS parentStatus',
        'st.name AS childStage',
        'sts.name AS childStatus',
        't.paymentStatus as paymentStatus',
        'ISNULL(t.updatedDate, t.createdDate) AS lastModified',
        't.createdDate AS createdDate',
        'rod.name AS location',
      ])
      .leftJoin('ts.transaction', 't')
      .leftJoin('t.staging', 'pst') // fk to transaction.stagingId
      .leftJoin('ts.staging', 'st') // fk to transactionService.stagingId
      .leftJoin('ts.service', 's') // fk to transactionService.serviceId
      .leftJoin('t.user', 'u') // fk to transaction.userId
      .leftJoin('u.userCompanies', 'uc') // fk to user.userCompanyId
      .leftJoin('uc.company', 'c') // fk to userCompany.companyId
      .leftJoin(RegistryOfDeedEntity, 'rod', 'rod.id = u.registryOfDeedId')
      .leftJoin('ts.stagingStatus', 'sts'); // fk to transactionService.stagingStatusId

    query.where('ts.deletedDate IS NULL');
    query.andWhere("ISNULL(ts.IsEOS,0)  = 0 AND ts.transactionServiceNumber <> 'eos'");
    query.andWhere('t.deletedDate IS NULL');
    query.andWhere("pst.code <> 'FOR_EOS_APPROVAL'");

    if (isAdmin) {
      // Exclude client's drafts
      query.andWhere('((t.type NOT IN (:...excludeTypes) OR pst.code <> :draftCode))', {
        excludeTypes: ['B2B_SS', 'B2B_SS_PO', 'B2C'],
        draftCode: 'DRAFT',
      });
    }

    if (userIds.length > 0) {
      query.andWhere('t.userId IN (:...userIds)', { userIds });
    }

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      query.andWhere('CAST(ISNULL(t.updatedDate, t.createdDate) AS DATE) BETWEEN :from AND :to', {
        from,
        to,
      });
    }

    if (companyId) {
      query.andWhere('c.id = :companyId', { companyId });
    }

    if (type === 'document') {
      query.andWhere('sts.id IS NOT NULL');
      query.leftJoin('sts.staging', 'sts_staging');
      query.andWhere('sts_staging.source = :docSource', { docSource: 'Secondary' });
    } else if (type === 'delivery') {
      query.innerJoin('sts.staging', 'sts_staging', 'sts_staging.code = :stagingCode', {
        stagingCode: 'SUCCESS_OUTPUT',
      });
      query.andWhere('sts.code != :excludeCode', { excludeCode: 'READY_FOR_RELEASE' });
      query.andWhere('sts.deletedDate IS NULL');
    }

    query.orderBy('ISNULL(t.updatedDate, t.createdDate)', 'DESC');

    const transactions = await query.getRawMany();

    // Format dates for raw query result
    transactions.forEach((record: { lastModified: string; createdDate: string }) => {
      record.lastModified = formatToUserDate(record.lastModified);
      record.createdDate = formatToUserDate(record.createdDate);
    });

    return transactions || [];
  }

  async transactionsSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    let effectiveCompanyId = companyId;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin,
      companyId: effectiveCompanyId,
      userType, // Add user type filter
    });
    if (!userId || !userIds.length) {
      return { total: 0, items: [] as Array<{ label: string; count: number }>, transactions: [] };
    }

    let tJoinCondition = 't.deletedDate IS NULL AND t.userId IN (:...userIds)';
    const params: any = { userIds, sources: ['Primary', 'Tertiary', 'Initial'] };

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      tJoinCondition +=
        ' AND CAST(ISNULL(t.updatedDate, t.createdDate) AS DATE) BETWEEN :from AND :to';
      params.from = from;
      params.to = to;
    }

    const qb = this.stagingRepo
      .createQueryBuilder('st')
      .leftJoin(TransactionEntity, 't', `t.stagingId = st.id AND ${tJoinCondition}`)
      .leftJoin('t.createdByUser', 'createdByUser') // Join to filter by creator for admin view
      .where('st.deletedDate IS NULL')
      .andWhere('st.source IN (:...sources)')
      .setParameters(params);

    if (isAdmin) {
      // exclide DRAFT transactions created by clients for admin view
      qb.andWhere('((t.type NOT IN (:...excludeTypes) OR st.code <> :draftCode))', {
        excludeTypes: ['B2B_SS', 'B2B_SS_PO', 'B2C'],
        draftCode: 'DRAFT',
      });
    }

    qb.select('st.name', 'label')
      .addSelect('COUNT(DISTINCT t.id)', 'count')
      .groupBy('st.name')
      .orderBy('COUNT(DISTINCT t.id)', 'DESC');

    const rows = await qb.getRawMany<{ label: string; count: string }>();
    const total = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);

    const transactions = await this.widgetTransactions({
      userId,
      range,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });

    return {
      total,
      items: rows.map((r) => ({ label: r.label || 'Unknown', count: Number(r.count || 0) })),
      transactions: transactions || [],
    };
  }

  async documentsSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    let effectiveCompanyId = companyId;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });
    if (!userIds.length) {
      return { total: 0, items: [] as Array<{ label: string; count: number }>, transactions: [] };
    }
    const transactions = await this.widgetTransactions({
      userId: userId,
      range,
      type: 'document',
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });
    const qb = this.documentRepo
      .createQueryBuilder('d')
      .where('d.DeletedDate IS NULL')
      .andWhere('d.UserId IN (:...userIds)', { userIds });

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      qb.andWhere('CAST(ISNULL(d.updatedDate, d.createdDate) AS DATE) BETWEEN :from AND :to', {
        from,
        to,
      });
    }

    qb.select('d.category', 'label').addSelect('COUNT(*)', 'count').groupBy('d.category');
    const rows = await qb.getRawMany<{ label: string; count: string }>();
    const total = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
    return {
      total,
      items: rows.map((r) => ({ label: r.label || 'Document', count: Number(r.count || 0) })),
      transactions,
    };
  }

  async deliveriesSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    let effectiveCompanyId = companyId;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });
    if (!userIds.length) {
      return {
        total: 0,
        items: [] as Array<{ label: string; code: string; count: number }>,
        transactions: [],
      };
    }
    const transactions = await this.widgetTransactions({
      userId: userId,
      range,
      type: 'delivery',
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });

    // Fetch child transaction statuses from SUCCESS_OUTPUT staging
    let tJoinCondition = 't.deletedDate IS NULL AND t.userId IN (:...userIds)';
    const params: any = {
      userIds,
      stagingCode: 'SUCCESS_OUTPUT',
    };

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      tJoinCondition +=
        ' AND CAST(ISNULL(t.updatedDate, t.createdDate) AS DATE) BETWEEN :from AND :to';
      params.from = from;
      params.to = to;
    }

    const qb = this.stagingRepo.manager
      .createQueryBuilder(StagingStatusEntity, 'ss')
      .innerJoin('ss.staging', 'staging', 'staging.code = :stagingCode')
      .leftJoin(
        'ss.transactionServices',
        'ts',
        'ts.deletedDate IS NULL AND (ISNULL(ts.isEOS, 0) = 0)',
      )
      .leftJoin('ts.transaction', 't', tJoinCondition)
      .andWhere('ss.deletedDate IS NULL')
      .setParameters(params);

    qb.select('ss.name', 'label')
      .addSelect('ss.code', 'code')
      .addSelect('COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN ts.id ELSE NULL END)', 'count')
      .groupBy('ss.name')
      .addGroupBy('ss.code')
      .orderBy('COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN ts.id ELSE NULL END)', 'DESC');

    const rows = await qb.getRawMany<{ label: string; code: string; count: string }>();
    const total = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
    return {
      total,
      items: rows.map((r) => ({
        label: r.label || 'Unspecified',
        code: r.code || 'UNSPECIFIED',
        count: Number(r.count || 0),
      })),
      transactions,
    };
  }

  async servicesDistribution(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    let effectiveCompanyId = companyId;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }

    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });

    if (!userIds.length) {
      return {
        total: 0,
        items: [] as Array<{ label: string; code: string; count: number }>,
        transactions: [],
      };
    }
    const transactions = await this.widgetTransactions({
      userId: userId,
      range,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });

    const qb = this.transactionServiceRepo
      .createQueryBuilder('ts')
      .leftJoin('ts.transaction', 't')
      .leftJoin('ts.service', 'svc')
      .leftJoin('t.staging', 'pst')
      .where('ts.deletedDate IS NULL')
      .andWhere('(ISNULL(ts.isEOS, 0) = 0)')
      .andWhere('t.userId IN (:...userIds)', { userIds });

    if (isAdmin) {
      // Exclude client's drafts
      qb.andWhere('((t.type NOT IN (:...excludeTypes) OR pst.code <> :draftCode))', {
        excludeTypes: ['B2B_SS', 'B2B_SS_PO', 'B2C'],
        draftCode: 'DRAFT',
      });
    }

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      qb.andWhere('CAST(ISNULL(ts.updatedDate, ts.createdDate) AS DATE) BETWEEN :from AND :to', {
        from,
        to,
      });
    }

    qb.select('svc.name', 'label')
      .addSelect('svc.serviceCode', 'code')
      .addSelect('COUNT(*)', 'count')
      .groupBy('svc.name')
      .addGroupBy('svc.serviceCode');

    const rows = await qb.getRawMany<{ label: string; code: string; count: string }>();
    const total = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
    return {
      total,
      items: rows.map((r) => ({
        label: r.label || 'Unknown Service',
        code: r.code || 'UNKNOWN',
        count: Number(r.count || 0),
      })),
      transactions,
    };
  }

  async paymentsSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    let effectiveCompanyId = companyId;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });

    if (!userIds.length) {
      return { total: 0, items: [] as Array<{ label: string; count: number }>, transactions: [] };
    }
    const transactions = await this.widgetTransactions({
      userId: userId,
      range,
      isAdmin,
      companyId: effectiveCompanyId,
      userType,
    });

    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.staging', 'pst')
      .where('t.deletedDate IS NULL')
      .andWhere('t.userId IN (:...userIds)', { userIds });

    // Exclude DRAFT and FOR_EOS_APPROVAL transactions from being counted as 'Pending' payments
    qb.andWhere('pst.code <> :draftCode', { draftCode: 'DRAFT' });
    qb.andWhere('pst.code <> :eosApprovalCode', { eosApprovalCode: 'FOR_EOS_APPROVAL' });

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      qb.andWhere('CAST(ISNULL(t.updatedDate, t.createdDate) AS DATE) BETWEEN :from AND :to', {
        from,
        to,
      });
    }

    qb.select("ISNULL(t.paymentStatus, 'Pending')", 'label')
      .addSelect('COUNT(t.id)', 'count')
      .groupBy("ISNULL(t.paymentStatus, 'Pending')");
    const rows = await qb.getRawMany<{ label: string; count: string }>();
    const total = rows.reduce((sum, r) => sum + Number(r.count || 0), 0);
    return {
      total,
      items: rows.map((r) => ({ label: r.label || 'Unknown', count: Number(r.count || 0) })),
      transactions,
    };
  }

  async getDocumentStatistics(
    userIds: string[],
    range?: DateRange,
    userId?: string,
    userType?: string,
  ) {
    // Build conditional join so we only filter transactions by user/date, but always include all secondary stagings
    const tsJoinCondition =
      'ts.DeletedDate IS NULL AND ts.StagingStatusId IS NOT NULL AND (ISNULL(ts.isEOS, 0) = 0)';
    let tJoinCondition = 't.userId IN (:...userIds)';
    const docParams: any = { userIds, source: 'Secondary' };

    if (range?.from || range?.to) {
      const { from, to } = this.dashboardHelperService.getEffectiveRange(range);
      tJoinCondition +=
        ' AND CAST(ISNULL(t.updatedDate, t.createdDate) AS DATE) BETWEEN :from AND :to';
      docParams.from = from;
      docParams.to = to;
    }

    // Start from StagingEntity (secondary = entities like BIR, RD, LGU) so they always appear even with 0 counts
    const allServicesQb = this.stagingRepo
      .createQueryBuilder('staging')
      .leftJoin('staging.stagingStatuses', 'ss')
      .leftJoin('ss.transactionServices', 'ts', tsJoinCondition)
      .leftJoin('ts.stagingStatusFinding', 'ssf')
      .leftJoin('ts.transaction', 't', tJoinCondition)
      .where('staging.source = :source') // Only secondary stagings are entities
      .andWhere('staging.deletedDate IS NULL')
      .setParameters(docParams);

    allServicesQb
      .select('staging.code', 'entityCode')
      .addSelect('MAX(staging.name)', 'entityName') // Use MAX to pick one name per code
      .addSelect('ss.name', 'statusName')
      .addSelect('ssf.name', 'findingName')
      .addSelect('COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN ts.id ELSE NULL END)', 'count')
      .groupBy('staging.code') // Group by code only, not name
      .addGroupBy('ss.name')
      .addGroupBy('ssf.name')
      .orderBy('count', 'DESC');

    const allRows = await allServicesQb.getRawMany<{
      entityName: string;
      entityCode: string;
      statusName: string;
      findingName: string;
      count: string;
    }>();

    // Entity colors mapped by code
    const entityColors = {
      BIR: '#f97316',
      RD: '#22c55e',
      LGU_ASSESSOR: '#0ea5e9',
      LGU_TREASURER: '#14b8a6',
      LTO: '#f59e0b',
      LANDTRAX: '#a855f7',
    };

    const entityCounts: Record<string, number> = {};
    const detailedStatuses: Array<{
      entity: string;
      entityCode: string;
      statusName: string;
      displayName: string;
      count: number;
      uniqueKey: string;
    }> = [];

    allRows.forEach((row) => {
      const entityName = row.entityName;
      const entityCode = row.entityCode;
      const statusName = row.statusName || '';
      const findingName = row.findingName;
      const count = Number(row.count || 0);

      // Build display name
      let displayName = '';
      if (findingName) {
        displayName = `${entityName}: With Findings - ${findingName}`;
      } else {
        displayName = `${entityName}: ${statusName}`;
      }

      // Create unique key combining entity, status, and finding
      const uniqueKey = `${entityCode}-${statusName}-${findingName || 'none'}`;

      // Aggregate by entity
      if (!entityCounts[entityCode]) {
        entityCounts[entityCode] = 0;
      }
      entityCounts[entityCode] += count;

      detailedStatuses.push({
        entity: entityName,
        entityCode,
        statusName,
        displayName,
        count,
        uniqueKey,
      });
    });

    // Convert to array — include all entities even if count is 0
    const entityRows = Object.entries(entityCounts).map(([code, count]) => ({
      code,
      name: allRows.find((r) => r.entityCode === code)?.entityName || code,
      count: count.toString(),
    }));

    // Get top 4 detailed statuses for progress bars
    const stageRows = detailedStatuses.toSorted((a, b) => b.count - a.count).slice(0, 4);

    const entityTotal = entityRows.reduce((sum, r) => sum + Number(r.count || 0), 0);
    const stageTotal = stageRows.reduce((sum, r) => sum + r.count, 0);

    // for CSV / XLSX export
    const transactions = userId
      ? await this.widgetTransactions({ userId, range, type: 'document', userType })
      : [];

    return {
      statistics: [{ label: 'Total', value: entityTotal.toString() }],
      byEntity: entityRows.map((item) => ({
        name: item.code, // Use code as unique key for byEntity
        label: item.name,
        value: Number(item.count || 0),
        percentage: Number(((Number(item.count || 0) / (entityTotal || 1)) * 100).toFixed(1)),
        fill: entityColors[item.code as keyof typeof entityColors] || '#64748b',
      })),
      byStage: stageRows.map((item) => ({
        name: item.uniqueKey, // Use unique composite key instead of just entity name
        label: item.displayName,
        value: item.count,
        percentage: Number(((item.count / (stageTotal || 1)) * 100).toFixed(1)),
        fill: entityColors[item.entityCode as keyof typeof entityColors] || '#64748b',
      })),
      transactions,
    };
  }
}
