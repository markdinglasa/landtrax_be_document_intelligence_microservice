import WidgetEntity from 'src/shared/infrastructure/database/entities/widget.entity';

export interface DateRange {
  from?: string;
  to?: string;
}

export type DashboardNamespace = 'client' | 'admin';

export abstract class DashboardService {
  abstract getWidgetsForUser(
    userId: string,
    namespace?: DashboardNamespace,
  ): Promise<WidgetEntity[]>;
  abstract getOrCreateClientWidgets(userId: string): Promise<WidgetEntity[]>;
  abstract getCompanyIdForUser(userId: string): Promise<string | null>;
  abstract createWidget(userId: string, dto: Partial<WidgetEntity>): Promise<WidgetEntity>;
  abstract updateWidget(widgetId: string, dto: Partial<WidgetEntity>): Promise<WidgetEntity>;
  abstract deleteWidget(widgetId: string): Promise<void>;
  abstract getWidgetById(widgetId: string): Promise<WidgetEntity | null>;

  abstract transactionsSummary(
    userId: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<{ total: number; items: Array<{ label: string; count: number }> }>;

  // abstract transactionStatusCount(
  //   userId?: string,
  //   isAdmin?: boolean,
  //   company?: string,
  //   range?: DateRange,
  // ): Promise<{ total: number; items: Array<{ label: string; count: number }> }>;

  abstract documentsSummary(
    userId: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<{ total: number; items: Array<{ label: string; count: number }> }>;

  abstract deliveriesSummary(
    userId: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string, // company-name
    userType?: string,
  ): Promise<{ total: number; items: Array<{ label: string; count: number }> }>;

  abstract servicesDistribution(
    userId: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<{ total: number; items: Array<{ label: string; count: number }> }>;

  abstract paymentsSummary(
    userId: string,
    isAdmin?: boolean,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<{ total: number; items: Array<{ label: string; count: number }> }>;

  abstract clientStatistics(userId: string, range?: DateRange): Promise<any>;
  abstract clientTransactions(userId: string, range?: DateRange): Promise<any>;
  abstract clientDocumentStatistics(userId: string, range?: DateRange): Promise<any>;
  abstract clientDeliveryStatistics(userId: string, range?: DateRange): Promise<any>;
  abstract clientServiceStatistics(userId: string, range?: DateRange): Promise<any>;

  abstract adminKpis(
    userId: string,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<{
    cards: Record<string, { value: number; changePct: number }>;
  }>;
  abstract adminDocumentStatistics(
    userId: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<any>;
  abstract adminServiceStatistics(
    userId: string,
    companyId?: string,
    range?: DateRange,
    company?: string,
    userType?: string,
  ): Promise<any>;
}
