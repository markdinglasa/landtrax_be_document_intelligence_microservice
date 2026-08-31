import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Entities } from '../models/general.model';
import CollectionMethodEntity from './collection-method.entity';
import { BaseEntity } from './general.entity';
import TransactionEntity from './transaction.entity';

@Entity(Entities.COLLECTION)
export default class CollectionEntity extends BaseEntity {
  @Column({ name: 'CollectionNumber', type: 'varchar', nullable: false })
  collectionNumber!: string;

  @Column({ name: 'CollectionDate', type: 'datetime', nullable: false })
  collectionDate!: Date;

  @Column({ name: 'TransactionId', type: 'varchar', nullable: false })
  transactionId!: string;

  @Column({ name: 'Currency', type: 'varchar', length: 10, nullable: true, default: 'PHP' })
  currency?: string | null;

  @Column({ name: 'Notes', type: 'text', nullable: true })
  notes?: string | null;

  // COLLECTION RELATIONSHIPS
  @OneToMany(() => CollectionMethodEntity, (collectionMethod) => collectionMethod.collection, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    cascade: true,
  })
  @JoinColumn({ name: 'CollectionId' })
  collectionMethods?: CollectionMethodEntity[];

  @ManyToOne(() => TransactionEntity, (transactions) => transactions.collections, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'TransactionId' })
  transactions?: TransactionEntity;

  // virtual fields
  amount?: number;

  @AfterLoad()
  calculateTotals() {
    this.setAmount();
  }

  setAmount() {
    this.amount = Number(
      (
        this.collectionMethods
          ?.filter((cm) => !cm.deletedDate)
          .reduce((acc, cm) => {
            const amount = cm.amount ?? 0;
            return acc + amount;
          }, 0) ?? 0
      )?.toFixed(2),
    );
  }
}
