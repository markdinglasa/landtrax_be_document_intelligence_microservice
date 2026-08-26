import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import CollectionEntity from './collection-entity';
import DocumentEntity from './document-entity';
import { LineEntity } from './general-entity';

@Entity(ENTITY.COLLECTION_RECEIPT)
export default class CollectionReceiptEntity extends LineEntity {
  @Column({ name: 'CollectionId', type: 'varchar', nullable: false })
  collectionId!: string;

  @Column({ name: 'DocumentId', type: 'varchar', nullable: false })
  documentId!: string;

  @ManyToOne(() => CollectionEntity, (collection) => collection.collectionReceipts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'CollectionId' })
  collection?: CollectionEntity;

  @ManyToOne(() => DocumentEntity, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'DocumentId' })
  document?: DocumentEntity;
}
