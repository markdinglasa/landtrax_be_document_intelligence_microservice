import { Column, Entity, Index } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';

@Entity(ENTITY.BRANDING)
export class BrandingEntity extends BaseEntity {
  @Column({ name: 'Type', type: 'varchar', nullable: false })
  type!: string;

  @Column({ name: 'Value', type: 'varchar', nullable: true })
  @Index()
  value!: string;

  @Column({ name: 'Name', type: 'varchar', nullable: true })
  @Index()
  name!: string;

  @Column({ name: 'FilePath', type: 'text', nullable: true })
  filePath?: string | null;

  @Column({ name: 'MimeType', type: 'varchar', nullable: true })
  mimeType?: string | null;

  @Column({ name: 'FileSize', type: 'int', nullable: true })
  fileSize?: number | null;
}
