import { Column, Entity } from 'typeorm';
import { Entities } from '../models/general.model';
import { BaseEntity } from './general.entity';

@Entity(Entities.LANDTRAX_ADDRESS)
export default class LandtraxAddressEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', nullable: false, length: 255 })
  name!: string;

  @Column({ name: 'StreetAddress', type: 'varchar', nullable: false, length: 500 })
  streetAddress!: string;

  @Column({ name: 'City', type: 'varchar', nullable: false, length: 255 })
  city!: string;

  @Column({ name: 'Province', type: 'varchar', nullable: false, length: 255 })
  province!: string;

  @Column({ name: 'PostalCode', type: 'varchar', nullable: false, length: 20 })
  postalCode!: string;

  @Column({ name: 'Country', type: 'varchar', nullable: false, length: 255 })
  country!: string;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;
}
