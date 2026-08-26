import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChartType, WidgetSize, WidgetType } from 'src/shared/common';
import WidgetEntity from 'src/shared/infrastructure/database/entities/widget-entity';
import { IsNull, Repository } from 'typeorm';
import { DashboardNamespace } from '../../domain/types';
import { DashboardHelperService } from './dashboard-helper-service';

@Injectable()
export class DashboardWidgetService {
  private readonly _logger = new Logger(DashboardWidgetService.name);

  private getDefaultClientWidgets(): Array<Partial<WidgetEntity>> {
    return [
      {
        title: 'Transaction Count',
        chartType: 'status_cards' as any,
        type: 'transactions_status_count' as any,
        size: WidgetSize.LARGE,
        position: 0,
        row: 0,
        col: 0,
        width: 4,
        height: 6,
        isVisible: true,
        isResizable: true,
        isDraggable: true,
        isShowGrid: false,
        isShowLegeng: false,
        isAnimate: true,
        refreshInterval: 300000,
        configuration: this.dashboardHelperService.serializeNullable({
          chartType: 'status_cards',
          showRefresh: true,
        }),
      },
      {
        title: 'Document Status',
        chartType: 'bar' as any,
        type: 'document_status' as any,
        size: WidgetSize.LARGE,
        position: 1,
        row: 0,
        col: 4,
        width: 4,
        height: 6,
        isVisible: true,
        isResizable: true,
        isDraggable: true,
        isShowGrid: false,
        isShowLegeng: false,
        isAnimate: true,
        refreshInterval: 300000,
        configuration: this.dashboardHelperService.serializeNullable({
          chartType: 'bar',
          showStatistics: true,
          showProgressBars: true,
        }),
      },
      {
        title: 'Delivery Status',
        chartType: 'donut' as any,
        type: 'delivery_status' as any,
        size: WidgetSize.MEDIUM,
        position: 2,
        row: 0,
        col: 8,
        width: 4,
        height: 2,
        isVisible: true,
        isResizable: true,
        isDraggable: true,
        isShowGrid: false,
        isShowLegeng: false,
        isAnimate: true,
        refreshInterval: 300000,
        configuration: this.dashboardHelperService.serializeNullable({
          chartType: 'donut',
          showLegend: true,
        }),
      },
      {
        title: 'Service Catalog',
        chartType: 'donut' as any,
        type: 'service_catalog' as any,
        size: WidgetSize.MEDIUM,
        position: 3,
        row: 2,
        col: 8,
        width: 4,
        height: 2,
        isVisible: true,
        isResizable: true,
        isDraggable: true,
        isShowGrid: false,
        isShowLegeng: false,
        isAnimate: true,
        refreshInterval: 300000,
        configuration: this.dashboardHelperService.serializeNullable({
          chartType: 'donut',
          showLegend: true,
          showSeeMore: true,
        }),
      },
      {
        title: 'Payment Overview',
        chartType: 'donut' as any,
        type: 'payment_overview' as any,
        size: WidgetSize.MEDIUM,
        position: 4,
        row: 4,
        col: 8,
        width: 4,
        height: 2,
        isVisible: true,
        isResizable: true,
        isDraggable: true,
        isShowGrid: false,
        isShowLegeng: false,
        isAnimate: true,
        refreshInterval: 300000,
        configuration: this.dashboardHelperService.serializeNullable({
          chartType: 'donut',
          showLegend: true,
        }),
      },
    ];
  }

  constructor(
    @InjectRepository(WidgetEntity)
    private readonly widgetRepo: Repository<WidgetEntity>,
    private readonly dashboardHelperService: DashboardHelperService,
  ) {}

  async getWidgetsForUser(userId: string, namespace?: DashboardNamespace): Promise<WidgetEntity[]> {
    const widgets = await this.widgetRepo.find({
      where: { userId, deletedDate: IsNull() },
      order: { position: 'ASC' },
    });
    return widgets.filter((w) => this.dashboardHelperService.widgetMatchesNamespace(w, namespace));
  }

  async getOrCreateClientWidgets(userId: string): Promise<WidgetEntity[]> {
    const widgets = await this.getWidgetsForUser(userId, 'client');
    if (widgets.length > 0) {
      return widgets;
    }

    const created: WidgetEntity[] = [];
    for (const template of this.getDefaultClientWidgets()) {
      const widget = await this.createWidget(
        userId,
        this.dashboardHelperService.normalizeWidgetNamespace(template as any, 'client'),
      );
      created.push(widget);
    }

    return created;
  }

  async createWidget(userId: string, dto: Partial<WidgetEntity>): Promise<WidgetEntity> {
    const now = new Date();
    const col = (dto as any)?.col ?? (dto as any)?.column ?? 0;
    const normalizedDto = this.dashboardHelperService.normalizeWidgetNamespace(
      dto as any,
      this.dashboardHelperService.safeJsonParse((dto as any)?.filter)?.namespace,
    );

    // Guard: avoid duplicate widgets per user/type (soft-deleted ignored)
    if (normalizedDto?.type) {
      const existing = await this.widgetRepo.findOne({
        where: {
          userId,
          type: normalizedDto.type,
          deletedDate: IsNull(),
        },
      });
      if (existing) {
        this._logger.log(
          `Reusing existing widget for user=${userId} type=${normalizedDto.type}, id=${existing.id}`,
        );
        return existing;
      }
    }

    const widget = this.widgetRepo.create({
      userId,
      title: normalizedDto?.title ?? 'Widget',
      chartType: normalizedDto?.chartType ?? ChartType.BAR,
      type: normalizedDto?.type ?? WidgetType.CUSTOM,
      size: normalizedDto?.size ?? WidgetSize.SMALL,
      position: normalizedDto?.position ?? 0,
      row: normalizedDto?.row ?? 0,
      col,
      width: normalizedDto?.width ?? 3,
      height: normalizedDto?.height ?? 2,
      isVisible: normalizedDto?.isVisible ?? true,
      isResizable: normalizedDto?.isResizable ?? true,
      isDraggable: normalizedDto?.isDraggable ?? true,
      isShowLegeng: normalizedDto?.isShowLegeng ?? normalizedDto?.isShowLegend ?? false,
      isShowGrid: normalizedDto?.isShowGrid ?? false,
      isAnimate: normalizedDto?.isAnimate ?? true,
      refreshInterval: normalizedDto?.refreshInterval ?? 300000,
      dataSource: this.dashboardHelperService.serializeNullable(normalizedDto?.dataSource),
      configuration: this.dashboardHelperService.serializeNullable(normalizedDto?.configuration),
      filter: this.dashboardHelperService.serializeNullable(normalizedDto?.filter),
      customQuery: this.dashboardHelperService.serializeNullable(normalizedDto?.customQuery),
      colorScheme: this.dashboardHelperService.serializeNullable(normalizedDto?.colorScheme),
      createdBy: userId,
      updatedBy: userId,
      createdDate: now,
      updatedDate: now,
    });
    return this.widgetRepo.save(widget);
  }

  async updateWidget(widgetId: string, dto: Partial<WidgetEntity>): Promise<WidgetEntity> {
    // Normalize/strip non-entity props (column -> col)
    const { column, col: dtoCol, ...rest } = dto as any;
    const col = dtoCol ?? column;
    await this.widgetRepo.update(
      { id: widgetId },
      {
        ...rest,
        ...(dto.configuration === undefined
          ? {}
          : {
              configuration: this.dashboardHelperService.serializeNullable(dto.configuration),
            }),
        ...(dto.filter === undefined
          ? {}
          : {
              filter: this.dashboardHelperService.serializeNullable(
                this.dashboardHelperService.normalizeWidgetNamespace(
                  dto as any,
                  this.dashboardHelperService.safeJsonParse((dto as any)?.filter)?.namespace,
                ).filter,
              ),
            }),
        ...(dto.customQuery === undefined
          ? {}
          : { customQuery: this.dashboardHelperService.serializeNullable(dto.customQuery) }),
        ...(dto.dataSource === undefined
          ? {}
          : { dataSource: this.dashboardHelperService.serializeNullable(dto.dataSource) }),
        ...(dto.colorScheme === undefined
          ? {}
          : { colorScheme: this.dashboardHelperService.serializeNullable(dto.colorScheme) }),
        ...(col === undefined ? {} : { col }),
        updatedDate: new Date(),
      },
    );
    const updated = await this.widgetRepo.findOne({ where: { id: widgetId } as any });
    if (!updated) {
      throw new Error('Widget not found');
    }
    return updated;
  }

  async deleteWidget(widgetId: string): Promise<void> {
    await this.widgetRepo.softDelete(widgetId);
  }

  async getWidgetById(widgetId: string): Promise<WidgetEntity | null> {
    return await this.widgetRepo.findOne({
      where: { id: widgetId, deletedDate: IsNull() },
    });
  }
}
