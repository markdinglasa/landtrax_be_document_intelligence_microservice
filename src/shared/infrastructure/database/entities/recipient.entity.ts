import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general.entity';
import RecipientDocumentsEntity from './recipient-documents.entity';
import TransactionEntity from './transaction.entity';

@Entity(ENTITY.RECIPIENT)
export default class RecipientEntity extends BaseEntity {
  @Column({ name: 'TransactionId', type: 'varchar', nullable: false })
  transactionId!: string;

  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  // RECIPIENT RELATIONSHIPS
  @ManyToOne(() => TransactionEntity, (transaction) => transaction.recipients, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'TransactionId', referencedColumnName: 'id' })
  transaction!: TransactionEntity;

  @OneToMany(() => RecipientDocumentsEntity, (rd) => rd.recipient, {
    eager: false,
    cascade: true,
  })
  recipientDocuments!: RecipientDocumentsEntity[];
}
