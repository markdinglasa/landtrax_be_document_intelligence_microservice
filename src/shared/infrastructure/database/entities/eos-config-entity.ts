import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('eos_config')
export default class EosConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'accepted_file_types' })
  acceptedFileTypes!: string; // comma-separated MIME types

  @Column({ type: 'int', name: 'max_file_size' })
  maxFileSize!: number; // in MB

  @Column({ type: 'varchar', length: 255, name: 'file_name_format' })
  fileNameFormat!: string; // e.g., "EOS_{transactionNumber}_{timestamp}"

  @Column({ type: 'datetime', name: 'created_date', default: () => 'CURRENT_TIMESTAMP' })
  createdDate!: Date;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'datetime', name: 'updated_date', nullable: true })
  updatedDate!: Date | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy!: string | null;

  @Column({ type: 'datetime', name: 'deleted_date', nullable: true })
  deletedDate!: Date | null;

  @Column({ type: 'uuid', name: 'deleted_by', nullable: true })
  deletedBy!: string | null;
}
