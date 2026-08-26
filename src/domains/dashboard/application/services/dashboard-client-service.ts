import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection-entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-entity';
import { IsNull, Repository } from 'typeorm';
import { DateRange } from '../../domain/types';
import { DashboardHelperService } from './dashboard-helper-service';
import { DashboardSummaryService } from './dashboard-summary-service';

@Injectable()
export class DashboardClientService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepo: Repository<ServiceEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepo: Repository<CollectionEntity>,
    private readonly dashboardSummaryService: DashboardSummaryService,
    private readonly dashboardHelperService: DashboardHelperService,
  ) {}

  async clientStatistics(userId: string, range?: DateRange) {
    const tx = await this.dashboardSummaryService.transactionsSummary(
      userId,
      false,
      undefined,
      range,
    );
    const docs = await this.dashboardSummaryService.documentsSummary(
      userId,
      false,
      undefined,
      range,
    );
    const payments = await this.dashboardSummaryService.paymentsSummary(
      userId,
      false,
      undefined,
      range,
    );

    return {
      transactions: {
        total: tx.total,
        change: 0,
        changeType: 'neutral',
        byStatus: tx.items.map((i) => ({ status: i.label, count: i.count.toString() })),
      },
      payments: {
        pending: payments.items.find((i) => i.label?.toLowerCase() === 'pending')?.count || 0,
        change: 0,
        changeType: 'neutral',
      },
      documents: {
        total: docs.total,
        change: 0,
        changeType: 'neutral',
      },
      services: {
        active: 0,
      },
    };
  }

  async clientTransactions(userId: string, range?: DateRange) {
    const tx = await this.dashboardSummaryService.transactionsSummary(
      userId,
      false,
      undefined,
      range,
    );
    const transactions = await this.dashboardSummaryService.widgetTransactions({ userId, range });

    return {
      total: tx.total,
      change: 0,
      changeType: 'neutral',
      byStatus: tx.items.map((i) => ({ status: i.label, count: i.count.toString() })),
      transactions: transactions,
    };
  }

  async clientDocumentStatistics(userId: string, range?: DateRange) {
    const userIds = await this.dashboardHelperService.resolveUserScope({ userId });
    if (!userIds.length) {
      return {
        statistics: [{ label: 'Total', value: '0' }],
        byEntity: [],
        byStage: [],
      };
    }

    return this.dashboardSummaryService.getDocumentStatistics(userIds, range, userId);
  }

  async clientDeliveryStatistics(userId: string, range?: DateRange) {
    const delivery = await this.dashboardSummaryService.deliveriesSummary(
      userId,
      false,
      undefined,
      range,
    );
    const total = delivery.total || 1;

    const labelMap: Record<string, { name: string; fill: string }> = {
      'out for delivery': { name: 'Out for Delivery', fill: '#f97316' },
      'for pick-up': { name: 'For Pick-Up', fill: '#22c55e' },
      'picked-up by client': { name: 'Picked Up by Client', fill: '#16a34a' },
      delivered: { name: 'Delivered', fill: '#38bdf8' },
      'ready for release': { name: 'Ready for Release', fill: '#8b5cf6' },
    };

    const data = delivery.items.map((item) => {
      const key = item.label?.toLowerCase() || '';
      const mapped = labelMap[key] || { name: item.label, fill: '#64748b' };
      return {
        name: mapped.name,
        value: item.count,
        fill: mapped.fill,
        code: item.code,
      };
    });

    // Ensure Ready for Release always appears in the widget
    const hasReadyForRelease = data.some((d) => d.code?.toUpperCase() === 'READY_FOR_RELEASE');
    if (!hasReadyForRelease) {
      data.unshift({
        name: 'Ready for Release',
        value: 0,
        fill: '#8b5cf6',
        code: 'READY_FOR_RELEASE',
      });
    }

    const completed =
      delivery.items.find((i) => i.label?.toLowerCase() === 'delivered')?.count ||
      delivery.items.find((i) => i.label?.toLowerCase() === 'picked-up by client')?.count ||
      0;
    const inTransit =
      delivery.items.find((i) => i.label?.toLowerCase() === 'out for delivery')?.count || 0;

    const transactions = await this.dashboardSummaryService.widgetTransactions({
      userId,
      range,
      type: 'delivery',
    });

    return {
      statistics: [{ label: 'Total', value: delivery.total.toString() }],
      data,
      total: delivery.total,
      summary: {
        inTransit,
        completed,
        completionRate: Number(((completed / total) * 100).toFixed(1)),
      },
      transactions,
    };
  }

  async clientServiceStatistics(userId: string, range?: DateRange) {
    const allServices = await this.serviceRepo.find({
      where: { deletedDate: IsNull() },
      select: ['name', 'serviceCode'],
      order: { name: 'ASC' },
    });
    const transactions = await this.dashboardSummaryService.widgetTransactions({ userId, range });
    const total = transactions?.length || 0;
    const svc = await this.dashboardSummaryService.servicesDistribution(
      userId,
      false,
      undefined,
      range,
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

    const topServices = allServicesWithCounts
      .toSorted((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((i) => ({
        name: i.label,
        count: i.count,
        percentage: total > 0 ? Number(((i.count / total) * 100).toFixed(1)) : 0,
        code: i.code,
      }));

    return {
      statistics: [{ label: 'Total', value: total.toString() }],
      data,
      total,
      topServices,
      transactions,
    };
  }
}
