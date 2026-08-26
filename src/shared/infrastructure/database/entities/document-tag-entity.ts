import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import DocumentEntity from './document-entity';
import { LineEntity } from './general-entity';
import TagEntity from './tag-entity';

@Entity(ENTITY.DOCUMENT_TAG)
export default class DocumentTagEntity extends LineEntity {
  @Column({ name: 'DocumentId', type: 'varchar', nullable: false })
  documentId!: string;

  @Column({ name: 'TagId', type: 'varchar', nullable: false })
  tagId!: string;

  // RELATIONSHIPS
  @ManyToOne(() => DocumentEntity, (document) => document.documentTags, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'DocumentId', referencedColumnName: 'id' })
  document!: DocumentEntity;

  @ManyToOne(() => TagEntity, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'TagId', referencedColumnName: 'id' })
  tag!: TagEntity;
}
