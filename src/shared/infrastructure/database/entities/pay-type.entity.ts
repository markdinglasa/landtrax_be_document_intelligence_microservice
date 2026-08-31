import { Column, Entity, JoinColumn, OneToMany } from 'typeorm';
import { Entities } from '../models/general.model';
import CollectionMethodEntity from './collection-method.entity';
import { BaseEntity } from './general-entity';

@Entity(Entities.PAY_TYPE)
export default class PayTypeEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'SortNumber', type: 'int', nullable: true })
  sortNumber!: number | null;

  // PAY TYPE RELATIONSHIPS
  @OneToMany(() => CollectionMethodEntity, (collectionMethod) => collectionMethod.payType, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'PayTypeId' })
  collectionMethods?: CollectionMethodEntity[];
}
