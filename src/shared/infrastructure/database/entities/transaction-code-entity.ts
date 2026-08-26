import { Column, Entity } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general-entity';

@Entity(ENTITY.TRANSACTION_CODE)
export default class TransactionCodeEntity extends LineEntity {
  @Column({ name: 'Code', type: 'varchar', length: 255, nullable: false })
  code!: string;

  @Column({ name: 'EntityCodeId', type: 'varchar', length: 255, nullable: true })
  entityCodeId!: string | null;

  @Column({ name: 'UserId', type: 'varchar', length: 255, nullable: true })
  userId!: string;

  @Column({ name: 'IsB2C', type: 'bit', nullable: false })
  isB2C!: boolean;
}
