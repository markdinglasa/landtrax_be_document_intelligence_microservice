import { Expose, Type } from 'class-transformer';

class AgingBreakdownDto {
  @Expose()
  @Type(() => Object)
  current: { count: number; amount: number };

  @Expose()
  @Type(() => Object)
  '1-30': { count: number; amount: number };

  @Expose()
  @Type(() => Object)
  '31-60': { count: number; amount: number };

  @Expose()
  @Type(() => Object)
  '61-90': { count: number; amount: number };

  @Expose()
  @Type(() => Object)
  '90+': { count: number; amount: number };
}

class PaymentMethodBreakdownDto {
  @Expose()
  method: string;

  @Expose()
  count: number;

  @Expose()
  amount: number;
}

export class CollectionsReportsSummaryResponseDto {
  @Expose()
  totalCount: number;

  @Expose()
  paidCount: number;

  @Expose()
  pendingCount: number;

  @Expose()
  failedCount: number;

  @Expose()
  overdueCount: number;

  @Expose()
  totalAmount: number;

  @Expose()
  paidAmount: number;

  @Expose()
  pendingAmount: number;

  @Expose()
  failedAmount: number;

  @Expose()
  overdueAmount: number;

  @Expose()
  @Type(() => AgingBreakdownDto)
  agingBreakdown: {
    current: { count: number; amount: number };
    '1-30': { count: number; amount: number };
    '31-60': { count: number; amount: number };
    '61-90': { count: number; amount: number };
    '90+': { count: number; amount: number };
  };

  @Expose()
  @Type(() => PaymentMethodBreakdownDto)
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
}
