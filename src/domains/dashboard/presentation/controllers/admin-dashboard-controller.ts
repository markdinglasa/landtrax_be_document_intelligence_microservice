import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import * as common from 'src/shared/common';
import { Audit } from 'src/modules/audit-trail/decorators/audit-decorator';
import { AuditDescription } from 'src/modules/audit-trail/decorators/audit-description-decorator';
import { AuditTrailService } from 'src/modules/audit-trail/types';
import JwtAuthGuard from 'src/modules/authentication/utils/jwt-auth-guard';
import { ReqContext, RequestContextDto } from 'src/utils/req-context.decorator';
import { DashboardService } from '../types';

function safeJsonParse(val: unknown): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return val;
  }
}

function mapWidget(w: any) {
  return {
    id: w.id,
    title: w.title,
    description: w.description ?? null,
    type: w.type,
    chartType: w.chartType,
    size: w.size,
    position: w.position,
    row: w.row,
    column: w.column ?? w.col ?? 0,
    col: w.col,
    width: w.width,
    height: w.height,
    isVisible: w.isVisible,
    isResizable: w.isResizable,
    isDraggable: w.isDraggable,
    configuration: safeJsonParse(w.configuration),
    filter: safeJsonParse(w.filter),
    dataSource: safeJsonParse(w.dataSource),
    customQuery: safeJsonParse(w.customQuery),
    colorScheme: safeJsonParse(w.colorScheme),
    userId: w.userId,
    createdAt: w.createdDate,
    updatedAt: w.updatedDate,
    showLegend: w.isShowLegend ?? w.isShowLegeng ?? false,
    showGrid: w.isShowGrid ?? false,
    animationEnabled: w.isAnimate ?? true,
    refreshInterval: w.refreshInterval,
  };
}

@ApiTags(common.API_TAGS.ADMIN_DASHBOARD)
@ApiBearerAuth(common.API_SECURITY.JWT_AUTH)
@UseGuards(JwtAuthGuard)
@Controller('admin/dashboard')
@Audit('Administration Dashboard')
export class AdminDashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  // Widgets CRUD scoped by admin user (separate namespace via API path)
  @Get('widgets')
  @AuditDescription('Viewed administrative dashboard layout and widgets')
  @ApiOperation({ summary: 'Get widgets for current admin user' })
  async getWidgets(@ReqContext() _req: RequestContextDto) {
    const userId = _req.userId;
    const widgets = await this.dashboardService.getWidgetsForUser(userId, 'admin');
    return widgets.map(mapWidget);
  }

  @Post('widgets')
  @AuditDescription("Added a new administrative data widget: '{title}'")
  @ApiOperation({ summary: 'Create widget for current admin user' })
  async createWidget(@ReqContext() _req: RequestContextDto, @Body() body: any) {
    const userId = _req.userId;
    const created = await this.dashboardService.createWidget(userId, {
      ...body,
      filter: { ...safeJsonParse(body?.filter), namespace: 'admin' },
    });
    return mapWidget(created);
  }

  @Patch('widgets/:id')
  @AuditDescription("Adjusted layout or settings for administrative widget '{identifier}'")
  @ApiOperation({ summary: 'Update widget for current admin user' })
  async updateWidget(@Param('id') id: string, @Body() body: any) {
    const updated = await this.dashboardService.updateWidget(id, body);
    return mapWidget(updated);
  }

  @Delete('widgets/:id')
  @AuditDescription("Removed administrative widget '{title}' from dashboard")
  @ApiOperation({ summary: 'Delete widget for current admin user' })
  async deleteWidget(@ReqContext() _req: RequestContextDto, @Param('id') id: string) {
    const record = await this.dashboardService.getWidgetById(id);
    if (record) _req.auditMetadata = { title: record.title };
    await this.dashboardService.deleteWidget(id);
    return { message: 'Deleted' };
  }

  // Aggregations
  @Get('kpis')
  @AuditDescription('Reviewed platform-wide Key Performance Indicators (KPIs)')
  @ApiOperation({ summary: 'Admin dashboard KPI cards' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async kpis(
    @ReqContext() _req: RequestContextDto,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    return await this.dashboardService.adminKpis(
      _req.userId,
      companyId ?? undefined,
      {
        from: dateFrom,
        to: dateTo,
      },
      company,
      userType,
    );
  }

  @Get('recent-activity')
  @AuditDescription('Reviewed recent platform-wide user activities and security events')
  @ApiOperation({ summary: 'Recent activity (admin scope)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async recentActivity(@ReqContext() _req: RequestContextDto, @Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(Math.max(Number.parseInt(limit, 10) || 6, 1), 100) : 6;
    // Admin feed: currently returns current admin's audit feed (can be expanded to global later)
    const userId = _req.userId;
    const rows = userId ? await this.auditTrailService.getUserAuditTrail(userId, limitNum, 0) : [];
    return rows.map((r) => ({
      type: (r.resource || '').toLowerCase(),
      action: r.action || 'event',
      description: `${r.resource} ${r.action || 'event'}`,
      user: r.userId,
      timestamp: r.timestamp?.toISOString?.() ? r.timestamp.toISOString() : (r.timestamp as any),
      metadata:
        safeJsonParse(r.details) && typeof safeJsonParse(r.details) === 'object'
          ? safeJsonParse(r.details)
          : {},
    }));
  }

  @Get('transactions/summary')
  @AuditDescription('Accessed global transaction throughput summary')
  @ApiOperation({ summary: 'Transaction summary (admin scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async transactionsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    const raw = await this.dashboardService.transactionsSummary(
      _req.userId,
      true,
      companyId || undefined,
      {
        from: from || dateFrom,
        to: to || dateTo,
      },
      company,
      userType,
    );
    return {
      total: raw.total ?? 0,
      change: 0,
      changeType: 'neutral',
      items:
        (raw as any)?.items?.map((i: any) => ({ label: i.label, count: String(i.count ?? 0) })) ??
        [],
    };
  }

  @Get('documents/summary')
  @AuditDescription('Accessed global document processing analytics')
  @ApiOperation({ summary: 'Document summary (admin scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async documentsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    return await this.dashboardService.documentsSummary(
      _req.userId,
      true,
      companyId ?? undefined,
      { from: from || dateFrom, to: to || dateTo },
      company,
      userType,
    );
  }

  @Get('deliveries/summary')
  @AuditDescription('Accessed global shipping and delivery fulfillment metrics')
  @ApiOperation({ summary: 'Delivery summary (admin scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async deliveriesSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    return await this.dashboardService.deliveriesSummary(
      _req.userId,
      true,
      companyId ?? undefined,
      { from: from || dateFrom, to: to || dateTo },
      company,
      userType,
    );
  }

  @Get('services/distribution')
  @AuditDescription('Accessed global service catalog distribution analytics')
  @ApiOperation({ summary: 'Service distribution (admin scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async servicesDistribution(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    return await this.dashboardService.servicesDistribution(
      _req.userId,
      true,
      companyId ?? undefined,
      { from: from || dateFrom, to: to || dateTo },
      company,
      userType,
    );
  }

  @Get('payments/summary')
  @AuditDescription('Accessed global payment and revenue summary metrics')
  @ApiOperation({ summary: 'Payment summary (admin scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async paymentsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    return await this.dashboardService.paymentsSummary(
      _req.userId,
      true,
      companyId ?? undefined,
      { from: from || dateFrom, to: to || dateTo },
      company,
      userType,
    );
  }

  // Analytics endpoints for widget dashboard
  @Get('analytics/transactions')
  @AuditDescription('Accessed transaction analytics for dashboard widgets')
  @ApiOperation({ summary: 'Transaction analytics (admin scope)' })
  @ApiQuery({ name: 'dateRange', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async transactionsAnalytics(
    @ReqContext() _req: RequestContextDto,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    const raw = await this.dashboardService.transactionsSummary(
      _req.userId,
      true,
      companyId || undefined,
      { from: dateFrom, to: dateTo },
      company,
      userType,
    );

    const transactions = (raw as any)?.transactions || [];

    return {
      items:
        (raw as any)?.items?.map((i: any) => ({
          label: i.label,
          count: Number(i.count ?? 0),
          percentage: Number(i.percentage ?? 0),
        })) ?? [],
      total: raw.total ?? 0,
      transactions,
    };
  }

  @Get('analytics/document-status')
  @AuditDescription('Accessed document status analytics for dashboard widgets')
  @ApiOperation({ summary: 'Document status analytics (admin scope)' })
  @ApiQuery({ name: 'dateRange', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async documentStatusAnalytics(
    @ReqContext() _req: RequestContextDto,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    // For admin, we need to get document status by entities (BIR, RD, LGU, etc.)
    // Use the same method as client but with admin scope to get all users' data
    const result = await this.dashboardService.adminDocumentStatistics(
      _req.userId,
      {
        from: dateFrom,
        to: dateTo,
      },
      company,
      userType,
    );

    return result;
  }

  @Get('analytics/delivery-status')
  @AuditDescription('Accessed delivery status analytics for dashboard widgets')
  @ApiOperation({ summary: 'Delivery status analytics (admin scope)' })
  @ApiQuery({ name: 'dateRange', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async deliveryStatusAnalytics(
    @ReqContext() _req: RequestContextDto,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    const raw = await this.dashboardService.deliveriesSummary(
      _req.userId,
      true,
      companyId ?? undefined,
      { from: dateFrom, to: dateTo },
      company,
      userType,
    );

    const items = (raw as any)?.items || [];
    const total = (raw as any)?.total || 0;

    const transactions = (raw as any)?.transactions || [];

    return {
      items: items.map((item: any, index: number) => ({
        name: item.label || 'Unknown',
        code: item.code || `STATUS_${index}`,
        value: Number(item.count || 0),
        percentage: total > 0 ? Math.round((Number(item.count || 0) / total) * 100) : 0,
        fill: this.getColorForIndex(index),
      })),
      total,
      transactions,
    };
  }

  @Get('analytics/service-catalog')
  @AuditDescription('Accessed service catalog analytics for dashboard widgets')
  @ApiOperation({ summary: 'Service catalog analytics (admin scope)' })
  @ApiQuery({ name: 'dateRange', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async serviceCatalogAnalytics(
    @ReqContext() _req: RequestContextDto,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    const raw = await this.dashboardService.adminServiceStatistics(
      _req.userId,
      companyId ?? undefined,
      { from: dateFrom, to: dateTo },
      company,
      userType,
    );

    const items = raw.data || [];
    const total = raw.total || 0;

    const transactions = raw?.transactions || [];

    return {
      items: items.map((item: any) => ({
        name: item.name || 'Unknown Service',
        code: item.code || 'UNKNOWN',
        value: Number(item.value || 0),
        percentage: total > 0 ? Math.round((Number(item.value || 0) / total) * 100) : 0,
        fill: item.fill,
      })),
      total,
      transactions,
    };
  }

  @Get('analytics/payment-overview')
  @AuditDescription('Accessed payment overview analytics for dashboard widgets')
  @ApiOperation({ summary: 'Payment overview analytics (admin scope)' })
  @ApiQuery({ name: 'dateRange', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'userType', required: false, type: String })
  async paymentOverviewAnalytics(
    @ReqContext() _req: RequestContextDto,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
    @Query('userType') userType?: string,
  ) {
    const companyId = _req.userId
      ? await this.dashboardService.getCompanyIdForUser(_req.userId)
      : null;
    const raw = await this.dashboardService.paymentsSummary(
      _req.userId,
      true,
      companyId ?? undefined,
      { from: dateFrom, to: dateTo },
      company,
      userType,
    );

    const items = (raw as any)?.items || [];
    const total = (raw as any)?.total || 0;

    return {
      items: items.map((item: any, index: number) => ({
        name: item.label || 'Unknown Payment',
        value: Number(item.count || 0),
        percentage: total > 0 ? Math.round((Number(item.count || 0) / total) * 100) : 0,
        fill: this.getColorForIndex(index),
      })),
      total,
    };
  }

  // Helper method to generate consistent colors
  private getColorForIndex(index: number): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#EC4899', // Pink
      '#6B7280', // Gray
    ];
    return colors[index % colors.length];
  }
}
