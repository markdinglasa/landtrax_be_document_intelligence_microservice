import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection-entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import { IsNull, Repository } from 'typeorm';
import { DateRange } from '../../domain/types';
import { DashboardHelperService } from './dashboard-helper-service';
import { DashboardSummaryService } from './dashboard-summary-service';

@Injectable()
export class DashboardAdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepo: Repository<CollectionEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    private readonly dashboardHelperService: DashboardHelperService,
    private readonly dashboardSummaryService: DashboardSummaryService,
  ) {}

  async adminDocumentStatistics(userId?: string, range?: DateRange, company?: string, userType?: string) {
    let effectiveCompanyId: string | undefined = undefined;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin: true,
      companyId: effectiveCompanyId,
      userType,
    });
    if (!userIds.length) {
      return {
        statistics: [],
        byEntity: [],
        byStage: [],
        transactions: [],
      };
    }

    const docStats = await this.dashboardSummaryService.getDocumentStatistics(
      userIds,
      range,
      userId,
      userType,
    );
    const transactions = userId
      ? await this.dashboardSummaryService.widgetTransactions({
          userId,
          range,
          type: 'document',
          isAdmin: true,
          companyId: effectiveCompanyId,
          userType,
        })
      : [];
    return {
      ...docStats,
      transactions,
    };
  }

  async adminServiceStatistics(
    userId: string,
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
      isAdmin: true,
      companyId: effectiveCompanyId,
      userType,
    });
    if (!userIds.length) {
      return { data: [], total: 0, transactions: [] };
    }

    const allServices = await this.serviceRepo.find({
      where: { deletedDate: IsNull() },
      select: ['name', 'serviceCode'],
      order: { name: 'ASC' },
    });

    const svc = await this.dashboardSummaryService.servicesDistribution(
      userId,
      true,
      companyId,
      range,
      company,
      userType,
    );

    const usedServicesMap = new Map(svc.items.map((item) => [item.code, item.count]));
    const colors = ['#8b5cf6', '#f59e0b', '#22c55e', '#0ea5e9', '#ef4444'];

    const allServicesWithCounts = allServices.map((service) => ({
      label: service.name,
      code: service.serviceCode,
      count: usedServicesMap.get(service.serviceCode) || 0,
    }));

    const data = allServicesWithCounts.map((item, idx) => ({
      name: item.label,
      value: item.count,
      fill: colors[idx % colors.length],
      code: item.code,
    }));

    const total = allServicesWithCounts.reduce((sum, item) => sum + item.count, 0);

    const topServices = allServicesWithCounts
      .toSorted((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((i) => ({
        name: i.label,
        count: i.count,
        percentage: total > 0 ? Number(((i.count / total) * 100).toFixed(1)) : 0,
        code: i.code,
      }));

    const transactions = await this.dashboardSummaryService.widgetTransactions({
      range,
      companyId,
      isAdmin: true,
      userId,
      userType,
    });

    return {
      statistics: [{ label: 'Total', value: total.toString() }],
      data,
      total,
      topServices,
      transactions,
    };
  }

  async adminKpis(userId: string, companyId?: string, range?: DateRange, company?: string, userType?: string) {
    let effectiveCompanyId = companyId;
    if (company && company.toLowerCase() !== 'all') {
      const resolvedId = await this.dashboardHelperService.resolveCompanyIdByName(company);
      effectiveCompanyId = resolvedId || '00000000-0000-0000-0000-000000000000';
    }
    const userIds = await this.dashboardHelperService.resolveUserScope({
      userId,
      isAdmin: true,
      companyId: effectiveCompanyId,
      userType,
    });

    const calcChangePct = (current: number, previous: number) => {
      if (!previous) return current ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prevMonthEnd = currentMonthStart;

    const scopeUserIds = userIds.length ? userIds : null;

    const totalUsersValue = effectiveCompanyId
      ? userIds.length
      : await this.userRepo.count({ where: { deletedDate: IsNull() } as any });

    const usersQb = this.userRepo.createQueryBuilder('u').where('u.deletedDate IS NULL');
    if (scopeUserIds) usersQb.andWhere('u.id IN (:...userIds)', { userIds: scopeUserIds });

    const totalUsersCurrentRow = await usersQb
      .clone()
      .andWhere('u.createdDate >= :from AND u.createdDate < :to', {
        from: currentMonthStart,
        to: nextMonthStart,
      })
      .select('COUNT(*)', 'count')
      .getRawOne<{ count: string }>();
    const totalUsersCurrent = Number(totalUsersCurrentRow?.count || 0);

    const totalUsersPrevRow = await usersQb
      .clone()
      .andWhere('u.createdDate >= :from AND u.createdDate < :to', {
        from: prevMonthStart,
        to: prevMonthEnd,
      })
      .select('COUNT(*)', 'count')
      .getRawOne<{ count: string }>();
    const totalUsersPrev = Number(totalUsersPrevRow?.count || 0);

    const baseTxQb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.staging', 'st')
      .where('t.deletedDate IS NULL');

    if (scopeUserIds) {
      baseTxQb.andWhere('t.userId IN (:...userIds)', { userIds: scopeUserIds });
    } else if (effectiveCompanyId) {
      baseTxQb.andWhere('1 = 0');
    }

    const totalTransactionsValue = await baseTxQb.clone().getCount();

    const totalTxCurrent = await baseTxQb
      .clone()
      .andWhere(
        'ISNULL(t.updatedDate, t.createdDate) >= :from AND ISNULL(t.updatedDate, t.createdDate) < :to',
        {
          from: currentMonthStart,
          to: nextMonthStart,
        },
      )
      .getCount();

    const totalTxPrev = await baseTxQb
      .clone()
      .andWhere(
        'ISNULL(t.updatedDate, t.createdDate) >= :from AND ISNULL(t.updatedDate, t.createdDate) < :to',
        {
          from: prevMonthStart,
          to: prevMonthEnd,
        },
      )
      .getCount();

    const pendingTransactionsValue = await baseTxQb
      .clone()
      .andWhere("(LOWER(st.name) LIKE '%pending%' OR st.code = 'PENDING_PAYMENT')")
      .getCount();

    const pendingTxCurrent = await baseTxQb
      .clone()
      .andWhere("(LOWER(st.name) LIKE '%pending%' OR st.code = 'PENDING_PAYMENT')")
      .andWhere(
        'ISNULL(t.updatedDate, t.createdDate) >= :from AND ISNULL(t.updatedDate, t.createdDate) < :to',
        {
          from: currentMonthStart,
          to: nextMonthStart,
        },
      )
      .getCount();

    const pendingTxPrev = await baseTxQb
      .clone()
      .andWhere("(LOWER(st.name) LIKE '%pending%' OR st.code = 'PENDING_PAYMENT')")
      .andWhere(
        'ISNULL(t.updatedDate, t.createdDate) >= :from AND ISNULL(t.updatedDate, t.createdDate) < :to',
        {
          from: prevMonthStart,
          to: prevMonthEnd,
        },
      )
      .getCount();

    const baseColQb = this.collectionRepo
      .createQueryBuilder('c')
      .where('c.deletedDate IS NULL')
      .andWhere('t.payementStatus IN (:...statuses)', { statuses: ['Completed', 'COMPLETED'] });

    if (scopeUserIds) baseColQb.andWhere('c.UserId IN (:...userIds)', { userIds: scopeUserIds });
    else baseColQb.andWhere('1 = 0');

    const revenueCurrentRow = await baseColQb
      .clone()
      .andWhere(
        'ISNULL(c.updatedDate, c.createdDate) >= :from AND ISNULL(c.updatedDate, c.createdDate) < :to',
        {
          from: currentMonthStart,
          to: nextMonthStart,
        },
      )
      .select('SUM(CAST(c.amount AS decimal(18,2)))', 'amount')
      .getRawOne<{ amount: string }>();
    const revenueThisMonth = Number(revenueCurrentRow?.amount || 0);

    const revenuePrevRow = await baseColQb
      .clone()
      .andWhere(
        'ISNULL(c.updatedDate, c.createdDate) >= :from AND ISNULL(c.updatedDate, c.createdDate) < :to',
        {
          from: prevMonthStart,
          to: prevMonthEnd,
        },
      )
      .select('SUM(CAST(c.amount AS decimal(18,2)))', 'amount')
      .getRawOne<{ amount: string }>();
    const revenuePrevMonth = Number(revenuePrevRow?.amount || 0);

    return {
      cards: {
        totalUsers: {
          value: totalUsersValue,
          changePct: calcChangePct(totalUsersCurrent, totalUsersPrev),
        },
        totalTransactions: {
          value: totalTransactionsValue,
          changePct: calcChangePct(totalTxCurrent, totalTxPrev),
        },
        pendingTransactions: {
          value: pendingTransactionsValue,
          changePct: calcChangePct(pendingTxCurrent, pendingTxPrev),
        },
        revenueThisMonth: {
          value: revenueThisMonth,
          changePct: calcChangePct(revenueThisMonth, revenuePrevMonth),
        },
      },
    };
  }
}
