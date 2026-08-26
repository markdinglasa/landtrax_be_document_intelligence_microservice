import { Expose } from 'class-transformer';

export class TransactionReportItemDto {
  @Expose()
  transactionNumber!: string;

  @Expose()
  service!: string;

  @Expose()
  transactionServiceNumber!: string;

  @Expose()
  clientName!: string;

  @Expose()
  proposalReference!: string;

  @Expose()
  requestor!: string;

  @Expose()
  parentStatus!: string;

  @Expose()
  childStage!: string;

  @Expose()
  childStatus!: string;

  @Expose()
  lastModified!: string;

  @Expose()
  createdDate!: string;

  @Expose()
  proposalRef?: string;

  @Expose()
  status!: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
}
