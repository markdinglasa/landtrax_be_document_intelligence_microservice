import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Entities } from '../models/general.model';
import CollectionEntity from './collection.entity';
import { LineEntity } from './general-entity';
import PayTypeEntity from './pay-type.entity';

@Entity(Entities.COLLECTION_METHOD)
export default class CollectionMethodEntity extends LineEntity {
  @Column({ name: 'CollectionId', type: 'varchar', nullable: false })
  collectionId!: string;

  @Column({ name: 'PayTypeId', type: 'varchar', nullable: false })
  payTypeId!: string;

  @Column({ name: 'Amount', type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: number;

  // COLLECTION METHOD RELATIONSHIPS
  @ManyToOne(() => CollectionEntity, (collection) => collection.collectionMethods, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'CollectionId' })
  collection?: CollectionEntity;

  @ManyToOne(() => PayTypeEntity, (payType) => payType.collectionMethods, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'PayTypeId' })
  payType?: PayTypeEntity;
}
