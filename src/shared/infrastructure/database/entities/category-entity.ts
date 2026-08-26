import { Column, Entity, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';
import ServiceEntity from './service-entity';

@Entity(ENTITY.CATEGORY)
export class CategoryEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'ColorHex', type: 'varchar', length: 255, nullable: false })
  colorHex!: string;

  @OneToMany(() => ServiceEntity, (service) => service.category, {
    eager: false,
  })
  services!: ServiceEntity[];
}
