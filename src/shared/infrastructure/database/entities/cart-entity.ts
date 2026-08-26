import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';
import TransactionEntity from './transaction-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.CART)
export default class CartEntity extends BaseEntity {
  @Column({ name: 'TransactionId', type: 'varchar', nullable: false })
  transactionId!: string;

  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'IsCheckout', type: 'bit', nullable: false })
  isCheckout!: boolean;

  // RELATIONSHIPS
  @ManyToOne(() => TransactionEntity, (t) => t.carts)
  @JoinColumn({ name: 'TransactionId' })
  transaction?: TransactionEntity;

  @ManyToOne(() => UserEntity, (user) => user.carts)
  @JoinColumn({ name: 'UserId' })
  user?: UserEntity;
}
