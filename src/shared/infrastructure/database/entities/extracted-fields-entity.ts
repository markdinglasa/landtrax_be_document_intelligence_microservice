import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import DocumentEntity from './document-entity';
import { LineEntity } from './general-entity';

@Entity(ENTITY.EXTRACTED_FIELDS)
export default class ExtractedFieldsEntity extends LineEntity {
  @Column({ name: 'DocumentId', type: 'varchar', nullable: false })
  documentId!: string;

  @Column({ name: 'Field', type: 'varchar', nullable: false })
  field!: string;

  @Column({ name: 'Value', type: 'varchar', nullable: true })
  value!: string | null;

  @Column({ name: 'Confidence', type: 'float', nullable: true })
  confidence!: number | null;

  @Column({ name: 'Placeholder', type: 'varchar', length: 255, nullable: true })
  placeholder!: string | null;

  // RELATIONSHIPS
  @ManyToOne(() => DocumentEntity, (d) => d.extractedFields)
  @JoinColumn({ name: 'DocumentId' })
  document!: DocumentEntity;
}
