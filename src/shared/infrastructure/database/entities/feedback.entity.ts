import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general.entity';
import TransactionEntity from './transaction.entity';

@Entity(ENTITY.FEEDBACK)
export default class FeedbackEntity extends BaseEntity {
  @Column({ name: 'TransactionId', type: 'varchar', nullable: false })
  transactionId!: string;

  @Column({ name: 'Remarks', type: 'text', nullable: false })
  remarks!: string;

  @Column({ name: 'Status', type: 'varchar', nullable: false })
  status!: string;

  // RELATIONSHIPS
  // transaction relationship fk
  @ManyToOne(() => TransactionEntity, (t) => t.feedbacks)
  @JoinColumn({ name: 'TransactionId' })
  transaction!: TransactionEntity;
}
