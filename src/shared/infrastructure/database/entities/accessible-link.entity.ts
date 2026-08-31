import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './general.entity';

@Entity("AccessibleLink")
export default class AccessibleLinkEntity extends BaseEntity {
  @Column({ name: 'Action', type: 'varchar', nullable: false })
  action!: string;

  @Column({ name: 'Category', type: 'varchar', nullable: false })
  category!: string;

}
