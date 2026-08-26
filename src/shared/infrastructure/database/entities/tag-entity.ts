import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.TAG)
export default class TagEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'ColorHex', type: 'varchar', length: 255, nullable: false })
  colorHex!: string;

  @Column({ name: 'Description', type: 'varchar', length: 500, nullable: true })
  description?: string | null;

  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string; // FK to user - tags are personalized per user

  // RELATIONSHIPS
  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'UserId', referencedColumnName: 'id' })
  user?: UserEntity;
}
