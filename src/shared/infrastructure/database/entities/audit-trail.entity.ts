import { AuditTrailStatus } from '../../../common/status.js';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Entities } from '../models/general.model';
import User from './user.entity';

@Entity(Entities.AUDIT_TRAIL)
export default class AuditTrailEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  id!: string;

  @Column({ name: 'UserId', type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ name: 'IpAddress', type: 'text', nullable: true })
  ipAddress?: string | null;

  @Column({ name: 'Resource', type: 'varchar', length: 255, nullable: false })
  resource!: string;

  @Column({ name: 'Area', type: 'varchar', length: 255, nullable: true })
  area?: string | null;

  @Column({ name: 'Action', type: 'varchar', length: 255, nullable: true })
  action!: string | null;

  @Column({ name: 'Details', type: 'text', nullable: true })
  details!: string | null;

  @Column({ name: 'Status', type: 'varchar', length: 255, nullable: false })
  status!: AuditTrailStatus;

  @Column({ name: 'Timestamp', type: 'datetime', nullable: false })
  timestamp!: Date;

  // AUDIT TRAIL RELATIONSHIPS
  @ManyToOne(() => User, (user) => user.auditTrails, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId' }) // this ensures the FK column is used
  user?: User;
}
