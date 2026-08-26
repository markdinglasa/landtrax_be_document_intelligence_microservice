import { ENTITY } from 'src/models/general-model';
import { AddressType } from 'src/models/masterfile-model';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './general-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.ADDRESS)
export default class AddressEntity extends BaseEntity {
  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'Type', type: 'varchar', nullable: false })
  type!: AddressType;

  @Column({ name: 'Barangay', type: 'varchar', nullable: false })
  barangay!: string;

  @Column({ name: 'StreetAddressLine1', type: 'text', nullable: false })
  streetAddressLine1: string | undefined;

  @Column({ name: 'StreetAddressLine2', type: 'text', nullable: true })
  streetAddressLine2: string | null | undefined;

  @Column({ name: 'City', type: 'varchar', nullable: false })
  city!: string;

  @Column({ name: 'Province', type: 'varchar', nullable: false })
  province!: string;

  @Column({ name: 'PostalCode', type: 'varchar', nullable: false })
  postalCode!: string;

  @Column({ name: 'Country', type: 'varchar', nullable: false })
  country!: string;

  // RELATIONSHIPS
  @ManyToOne(() => UserEntity, (user) => user.addresses)
  @JoinColumn({ name: 'UserId' })
  user?: UserEntity;
}
