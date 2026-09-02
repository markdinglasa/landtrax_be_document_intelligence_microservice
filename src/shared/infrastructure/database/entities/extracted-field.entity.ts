import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model.js';
import DocumentEntity from './document.entity.js';
import { LineEntity } from './general.entity.js';

/**
 * Stores individual OCR-extracted field values for a document.
 * Each record represents one field (e.g., "Title No.", "Buyer's Name")
 * extracted from a specific document during OCR processing.
 *
 * The `isUserModified` flag tracks whether the user has manually edited
 * the value, enabling the Overwrite/Keep conflict resolution flow.
 */
@Entity(ENTITY.EXTRACTED_FIELDS)
export default class ExtractedFieldEntity extends LineEntity {
  @Column({ name: 'DocumentId', type: 'uniqueidentifier', nullable: false })
  documentId!: string;

  @Column({ name: 'FieldName', type: 'varchar', length: 255, nullable: false })
  fieldName!: string;

  @Column({ name: 'FieldValue', type: 'text', nullable: true })
  fieldValue!: string | null;

  @Column({ name: 'Confidence', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence!: number | null;

  @Column({ name: 'IsUserModified', type: 'bit', nullable: false, default: false })
  isUserModified!: boolean;

  @Column({ name: 'ExtractedDate', type: 'datetimeoffset', nullable: true })
  extractedDate!: Date | null;

  // Relationships
  @ManyToOne(() => DocumentEntity, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'DocumentId', referencedColumnName: 'id' })
  document?: DocumentEntity;
}
