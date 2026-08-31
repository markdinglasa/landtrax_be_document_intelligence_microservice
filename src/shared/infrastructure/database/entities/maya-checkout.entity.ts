import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general.entity';
import TransactionEntity from './transaction.entity';

@Entity(ENTITY.MAYA_CHECKOUT)
export default class MayaCheckoutEntity extends BaseEntity {
  @Column({ name: 'TransactionId', type: 'varchar', nullable: false })
  transactionId!: string;

  @Column({ name: 'CheckoutId', type: 'varchar', length: 255, nullable: false })
  checkoutId!: string;

  @Column({ name: 'ReferenceNumber', type: 'varchar', length: 255, nullable: false })
  referenceNumber!: string;

  @Column({ name: 'CheckoutUrl', type: 'varchar', length: 1000, nullable: true })
  checkoutUrl?: string | null;

  @Column({ name: 'Status', type: 'varchar', length: 50, nullable: false, default: 'PENDING' })
  status!: string;

  @Column({ name: 'MdrAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  mdrAmount?: number | null;

  @Column({ name: 'Type', type: 'varchar', length: 255, nullable: true })
  type?: 'e-wallet' | 'card';

  // MAYA CHECKOUT RELATIONSHIPS
  @ManyToOne(() => TransactionEntity, (transaction) => transaction.mayaCheckouts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'TransactionId' })
  transaction?: TransactionEntity;
}
