import { Column, Entity, Index } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general-entity';

@Entity(ENTITY.BLACKLISTED_TOKEN)
export default class BlacklistedTokenEntity extends LineEntity {
  @Index()
  @Column({ name: 'Token', type: 'varchar', length: 2000, nullable: false })
  token!: string;

  @Column({ name: 'ExpiryDate', type: 'datetimeoffset', nullable: false })
  expiryDate!: Date;
}
