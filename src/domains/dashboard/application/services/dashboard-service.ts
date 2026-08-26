import { Injectable, Logger } from '@nestjs/common';
import WidgetEntity from 'src/shared/infrastructure/database/entities/widget-entity';
import { DashboardNamespace, DashboardService, DateRange } from '../../domain/types';
import { DashboardAdminService } from './dashboard-admin-service';
import { DashboardClientService } from './dashboard-client-service';
import { DashboardHelperService } from './dashboard-helper-service';
import { DashboardSummaryService } from './dashboard-summary-service';
import { DashboardWidgetService } from './dashboard-widget-service';

@Injectable()
export class DashboardServiceImpl extends DashboardService {
  private readonly _logger = new Logger(DashboardServiceImpl.name);

  constructor(
    private readonly dashboardHelperService: DashboardHelperService,
    private readonly dashboardWidgetService: DashboardWidgetService,
    private readonly dashboardSummaryService: DashboardSummaryService,
    private readonly dashboardClientService: DashboardClientService,
    private readonly dashboardAdminService: DashboardAdminService,
  ) {
    super();
  }

  // ─────────────────────────────────────────────────────────
  // Helper / General
  // ─────────────────────────────────────────────────────────
  async getCompanyIdForUser(userId: string): Promise<string | null> {
    return this.dashboardHelperService.getCompanyIdForUser(userId);
  }

  // ─────────────────────────────────────────────────────────
  // Widget Management
  // ─────────────────────────────────────────────────────────
  async getWidgetsForUser(userId: string, namespace?: DashboardNamespace): Promise<WidgetEntity[]> {
    return this.dashboardWidgetService.getWidgetsForUser(userId, namespace);
  }

  async getOrCreateClientWidgets(userId: string): Promise<WidgetEntity[]> {
    return this.dashboardWidgetService.getOrCreateClientWidgets(userId);
  }

  async createWidget(userId: string, dto: Partial<WidgetEntity>): Promise<WidgetEntity> {
    return this.dashboardWidgetService.createWidget(userId, dto);
  }

  async updateWidget(widgetId: string, dto: Partial<WidgetEntity>): Promise<WidgetEntity> {
    return this.dashboardWidgetService.updateWidget(widgetId, dto);
  }

  async deleteWidget(widgetId: string): Promise<void> {
    return this.dashboardWidgetService.deleteWidget(widgetId);
  }

  async getWidgetById(widgetId: string): Promise<WidgetEntity | null> {
    return this.dashboardWidgetService.getWidgetById(widgetId);
  }

  // ─────────────────────────────────────────────────────────
  // Summaries
  // ─────────────────────────────────────────────────────────
  async transactionsSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    return this.dashboardSummaryService.transactionsSummary(
      userId,
      isAdmin,
      companyId,
      range,
      company,
      userType,
    );
  }

  async documentsSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    return this.dashboardSummaryService.documentsSummary(
      userId,
      isAdmin,
      companyId,
      range,
      company,
      userType,
    );
  }

  async deliveriesSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    return this.dashboardSummaryService.deliveriesSummary(
      userId,
      isAdmin,
      companyId,
      range,
      company,
      userType,
    );
  }

  async servicesDistribution(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    return this.dashboardSummaryService.servicesDistribution(
      userId,
      isAdmin,
      companyId,
      range,
      company,
      userType,
    );
  }

  async paymentsSummary(
    userId?: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    return this.dashboardSummaryService.paymentsSummary(userId, isAdmin, companyId, range, company, userType);
  }

  // ─────────────────────────────────────────────────────────
  // Client Stats
  // ─────────────────────────────────────────────────────────
  async clientStatistics(userId: string, range?: DateRange) {
    return this.dashboardClientService.clientStatistics(userId, range);
  }

  async clientTransactions(userId: string, range?: DateRange) {
    return this.dashboardClientService.clientTransactions(userId, range);
  }

  async clientDocumentStatistics(userId: string, range?: DateRange) {
    return this.dashboardClientService.clientDocumentStatistics(userId, range);
  }

  async clientDeliveryStatistics(userId: string, range?: DateRange) {
    return this.dashboardClientService.clientDeliveryStatistics(userId, range);
  }

  async clientServiceStatistics(userId: string, range?: DateRange) {
    return this.dashboardClientService.clientServiceStatistics(userId, range);
  }

  // ─────────────────────────────────────────────────────────
  // Admin Stats
  // ─────────────────────────────────────────────────────────
  async adminKpis(userId: string, companyId?: string, range?: DateRange, company?: string, userType?: string) {
    return this.dashboardAdminService.adminKpis(userId, companyId, range, company, userType);
  }

  async adminDocumentStatistics(userId?: string, range?: DateRange, company?: string, userType?: string) {
    return this.dashboardAdminService.adminDocumentStatistics(userId, range, company, userType);
  }

  async adminServiceStatistics(
    userId: string,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ) {
    return await this.dashboardAdminService.adminServiceStatistics(
      userId,
      companyId,
      range,
      company,
      userType,
    );
  }
}
