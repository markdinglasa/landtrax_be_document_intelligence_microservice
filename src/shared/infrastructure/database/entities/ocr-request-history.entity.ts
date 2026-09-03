import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ENTITY } from '../models/general-model.js';
import DocumentEntity from './document.entity.js';
import UserEntity from './user.entity.js';

/**
 * Logs every OCR processing attempt (success or failure) for audit
 * and debugging purposes. Each terminal state of the OCR pipeline
 * creates one record in this table.
 */
@Entity(ENTITY.OCR_REQUEST_HISTORY)
export default class OCRRequestHistoryEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'Id' })
  id!: string;

  @Column({ name: 'DocumentId', type: 'varchar', nullable: false })
  documentId!: string;

  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'Response', type: 'text', nullable: true })
  response!: string | null;

  @Column({ name: 'Payload', type: 'text', nullable: true })
  payload!: string | null;

  @Column({ name: 'ErrorMessage', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'Status', type: 'varchar', length: 100, nullable: false })
  status!: string;

  @Column({ name: 'Timestamp', type: 'datetimeoffset', nullable: false })
  timestamp!: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID().toUpperCase();
    }
  }

  // Relationships
  @ManyToOne(() => DocumentEntity, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'DocumentId', referencedColumnName: 'id' })
  document?: DocumentEntity;

  @ManyToOne(() => UserEntity, {
    eager: false,
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId', referencedColumnName: 'id' })
  user?: UserEntity;
}
