import { Expose, Type } from 'class-transformer';

class StatusBreakdownDto {
  @Expose()
  status: string;

  @Expose()
  count: number;

  @Expose()
  percentage: number;
}

class TypeBreakdownDto {
  @Expose()
  type: string;

  @Expose()
  count: number;

  @Expose()
  percentage: number;
}

class PriorityBreakdownDto {
  @Expose()
  priority: string;

  @Expose()
  count: number;

  @Expose()
  percentage: number;
}

class MonthlyTrendDto {
  @Expose()
  month: string;

  @Expose()
  count: number;

  @Expose()
  completedCount: number;
}

export class TransactionReportsSummaryResponseDto {
  @Expose()
  totalCount: number;

  @Expose()
  draftCount: number;

  @Expose()
  pendingCount: number;

  @Expose()
  inProgressCount: number;

  @Expose()
  completedCount: number;

  @Expose()
  cancelledCount: number;

  @Expose()
  onHoldCount: number;

  @Expose()
  @Type(() => StatusBreakdownDto)
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;

  @Expose()
  @Type(() => TypeBreakdownDto)
  typeBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;

  @Expose()
  @Type(() => PriorityBreakdownDto)
  priorityBreakdown: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;

  @Expose()
  @Type(() => MonthlyTrendDto)
  monthlyTrend: Array<{
    month: string;
    count: number;
    completedCount: number;
  }>;

  @Expose()
  averageCompletionTime: number;

  @Expose()
  completionRate: number;

  @Expose()
  totalEstimatedValue: number;

  @Expose()
  totalActualValue: number;
}
