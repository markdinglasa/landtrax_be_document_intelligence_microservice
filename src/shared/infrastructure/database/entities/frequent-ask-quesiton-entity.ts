import { Column, Entity } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';

@Entity(ENTITY.FAQ)
export default class FAQEntity extends BaseEntity {
  @Column({ name: 'Title', type: 'varchar', length: 255, nullable: false, unique: true })
  title!: string;

  @Column({ name: 'Content', type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;
}
