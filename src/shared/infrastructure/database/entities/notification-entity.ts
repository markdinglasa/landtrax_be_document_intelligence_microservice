import { ENTITY } from 'src/models/general-model';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { type NotificationType } from '../models/utility-model';
import { BaseEntity } from './general-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.NOTIFICATION)
export default class NotificationEntity extends BaseEntity {
  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'Type', type: 'varchar', nullable: false })
  type!: NotificationType;

  // @Column({ name: 'Title', type: 'varchar', nullable: false })
  // title!: string;

  @Column({ name: 'Details', type: 'varchar', nullable: true })
  details!: string | null;

  @Column({ name: 'Link', type: 'varchar', nullable: true })
  link!: string | null;

  @Column({ name: 'IsRead', type: 'bit', nullable: false })
  isRead!: boolean;

  // NOTIFICATION RELATIONSHIPS
  @ManyToOne(() => UserEntity, (user) => user.notifications, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId' })
  user!: UserEntity;
}
