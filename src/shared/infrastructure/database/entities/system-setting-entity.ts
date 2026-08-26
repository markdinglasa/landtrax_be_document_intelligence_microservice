import { Column, Entity, Index } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';

@Entity(ENTITY.SYSTEM_SETTINGS)
@Index(['key'], { unique: true })
export default class SystemSettingEntity extends BaseEntity {
  @Column({ name: 'Key', type: 'varchar', length: 100, nullable: false })
  key!: string;

  @Column({ name: 'Name', type: 'varchar', length: 200, nullable: false })
  name!: string;

  @Column({ name: 'Value', type: 'text', nullable: false })
  value!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'Category', type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;
}
