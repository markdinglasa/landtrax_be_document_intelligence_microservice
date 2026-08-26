import { Expose } from 'class-transformer';

export class CourierReportItemDto {
  @Expose()
  transactionNumber!: string;

  @Expose()
  transactionServiceNumber!: string;

  @Expose()
  courierProvider!: string;

  @Expose()
  status!:
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FOR_PICK_UP'
    | 'PICKED_UP_BY_CLIENT'
    | 'READY_FOR_RELEASE';

  @Expose()
  location!: string;

  @Expose()
  deliveryMethod!: string;

  @Expose()
  deliveryAddress!: string;

  @Expose()
  trackingNumber!: string;

  @Expose()
  recipientName!: string;
}
