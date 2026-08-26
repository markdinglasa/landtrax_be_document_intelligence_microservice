import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import UserEntity from './user-entity';

type AuditExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type AuditExportJobFormat = 'csv' | 'xlsx';

@Entity('AuditExportJob')
export default class AuditExportJobEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  id!: string;

  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'Status', type: 'varchar', nullable: false, default: 'pending' })
  status!: AuditExportJobStatus;

  @Column({ name: 'Format', type: 'varchar', nullable: false })
  format!: AuditExportJobFormat;

  @Column({ name: 'Filters', type: 'text', nullable: true })
  filters!: string | null;

  @Column({ name: 'RecordCount', type: 'int', nullable: true })
  recordCount!: number | null;

  @Column({ name: 'DownloadUrl', type: 'text', nullable: true })
  downloadUrl!: string | null;

  @Column({ name: 'ExpiresAt', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'ErrorMessage', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime', nullable: false })
  createdAt!: Date;

  @Column({ name: 'CompletedAt', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @ManyToOne(() => UserEntity, { eager: false, onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'UserId' })
  user?: UserEntity;
}
