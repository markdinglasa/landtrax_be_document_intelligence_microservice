import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general-entity';
import TransactionEntity from './transaction-entity';
import TransactionServiceEntity from './transaction-service-entity';

@Entity(ENTITY.TRANSACTION_HISTORY)
export default class TransactionHistoryEntity extends LineEntity {
  @Column({ name: 'Title', type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ name: 'Status', type: 'varchar', length: 255, nullable: false })
  status!: string; // transaciton-service staging or staging-status

  @Column({ name: 'Description', type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'IsParent', type: 'bit', nullable: false })
  isParent!: boolean;

  @Column({ name: 'Remarks', type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ name: 'TransactionId', type: 'varchar', nullable: true })
  transactionId!: string | null;

  @ManyToOne(() => TransactionEntity, (transaction) => transaction.history, {
    eager: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({ name: 'TransactionId' })
  transaction?: TransactionEntity;

  @Column({ name: 'TransactionServiceId', type: 'varchar', nullable: true })
  transactionServiceId?: string | null;

  @ManyToOne(() => TransactionServiceEntity, (transactionService) => transactionService.history, {
    eager: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  })
  @JoinColumn({ name: 'TransactionServiceId' })
  transactionService?: TransactionServiceEntity;
}
