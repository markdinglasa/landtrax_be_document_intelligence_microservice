import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import * as common from 'src/shared/common';
import { Audit } from 'src/modules/audit-trail/decorators/audit-decorator';
import { AuditDescription } from 'src/modules/audit-trail/decorators/audit-description-decorator';
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
    col: w.col, // keep legacy field for consumers that still read it
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

@ApiTags(common.API_TAGS.DASHBOARD)
@ApiBearerAuth(common.API_SECURITY.JWT_AUTH)
@UseGuards(JwtAuthGuard)
@Controller('client/dashboard')
@Audit('Dashboard')
export class ClientDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Widgets CRUD scoped to current user
  @Get('widgets')
  @ApiOperation({ summary: 'Get widgets for current client user' })
  async getWidgets(@ReqContext() _req: RequestContextDto) {
    const widgets = await this.dashboardService.getOrCreateClientWidgets(_req.userId);
    return widgets.map(mapWidget);
  }

  @Post('widgets')
  @AuditDescription("Customized dashboard by adding a new data widget: '{title}'")
  @ApiOperation({ summary: 'Create widget for current client user' })
  async createWidget(
    @ReqContext() req: RequestContextDto,
    @Body() body: any, // create dto on body inference
  ) {
    req.auditMetadata = { title: body.title || 'New Widget' };
    // Persist namespace in filter for separation
    const created = await this.dashboardService.createWidget(req.userId, {
      ...body,
      filter: { ...safeJsonParse(body?.filter), namespace: 'client' },
    });
    return mapWidget(created);
  }

  @Patch('widgets/:id')
  @AuditDescription("Modified the layout or configuration for dashboard widget '{identifier}'")
  @ApiOperation({ summary: 'Update widget for current client user' })
  async updateWidget(
    @Param('id') id: string,
    @Body() body: any, // create dto on body inference
    @Request() req: RequestContextDto,
  ) {
    const record = await this.dashboardService.getWidgetById(id);
    if (record) req.auditMetadata = { identifier: record.title };
    const updated = await this.dashboardService.updateWidget(id, body);
    return mapWidget(updated);
  }

  @Delete('widgets/:id')
  @AuditDescription("Removed dashboard widget '{title}'")
  @ApiOperation({ summary: 'Delete widget for current client user' })
  async deleteWidget(@Param('id') id: string, @Request() req: RequestContextDto) {
    const record = await this.dashboardService.getWidgetById(id);
    if (record) req.auditMetadata = { title: record.title };
    await this.dashboardService.deleteWidget(id);
    return { message: 'Deleted' };
  }

  // Aggregations
  @Get('transactions/summary')
  @AuditDescription('Accessed transaction summary analytics')
  @ApiOperation({ summary: 'Transaction summary (client scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async transactionsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const raw = await this.dashboardService.transactionsSummary(_req.userId, false, undefined, {
      from: from || dateFrom,
      to: to || dateTo,
    });

    return raw;
  }

  @Get('documents/summary')
  @AuditDescription('Accessed document processing metrics')
  @ApiOperation({ summary: 'Document summary (client scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async documentsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.documentsSummary(_req.userId, false, undefined, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('deliveries/summary')
  @AuditDescription('Accessed delivery and shipping metrics')
  @ApiOperation({ summary: 'Delivery summary (client scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async deliveriesSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.deliveriesSummary(_req.userId, false, undefined, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('services/distribution')
  @AuditDescription('Accessed service distribution analytics')
  @ApiOperation({ summary: 'Service distribution (client scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async servicesDistribution(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.servicesDistribution(_req.userId, false, undefined, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('payments/summary')
  @AuditDescription('Accessed payment and collection analytics')
  @ApiOperation({ summary: 'Payment summary (client scope)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async paymentsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.paymentsSummary(_req.userId, false, undefined, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  // Legacy paths used by frontend DashboardAPI
  @Get('statistics')
  @ApiOperation({ summary: 'Client dashboard statistics (legacy shape)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async clientStatistics(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.clientStatistics(_req.userId, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Client dashboard statistics (legacy shape)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async clientTransactions(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.clientTransactions(_req.userId, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('documents')
  @ApiOperation({ summary: 'Client document statistics (legacy shape)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async clientDocuments(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.clientDocumentStatistics(_req.userId, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('delivery')
  @ApiOperation({ summary: 'Client delivery statistics (legacy shape)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async clientDelivery(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.clientDeliveryStatistics(_req.userId, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('services')
  @ApiOperation({ summary: 'Client service statistics (legacy shape)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  async clientServices(
    @ReqContext() _req: RequestContextDto,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.dashboardService.clientServiceStatistics(_req.userId, {
      from: from || dateFrom,
      to: to || dateTo,
    });
  }

  @Get('payment-overview')
  @AuditDescription('Accessed payment overview analytics for dashboard widgets')
  @ApiOperation({ summary: 'Payment overview analytics (admin scope)' })
  @ApiQuery({ name: 'dateRange', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  async paymentOverviewAnalytics(
    @ReqContext() _req: RequestContextDto,
    @Query('dateRange') dateRange?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('company') company?: string,
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
    );

    const items = (raw as any)?.items || [];
    const total = (raw as any)?.total || 0;
    const transactions = (raw as any)?.transactions || 0;

    return {
      items: items.map((item: any, index: number) => ({
        name: item.label || 'Unknown Payment',
        value: Number(item.count || 0),
        percentage: total > 0 ? Math.round((Number(item.count || 0) / total) * 100) : 0,
        fill: this.getColorForIndex(index),
      })),
      total,
      transactions: transactions,
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
