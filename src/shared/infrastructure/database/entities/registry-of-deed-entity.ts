import { Column, Entity, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';
import TransactionEntity from './transaction-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.REGISTRY_OF_DEED)
export class RegistryOfDeedEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false, unique: true })
  name!: string;

  @Column({ name: 'Abbreviation', type: 'varchar', length: 100, nullable: true })
  abbreviation!: string | null;

  @Column({ name: 'Address', type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;

  //
  @OneToMany(() => UserEntity, (user) => user.location)
  users?: UserEntity[];

  @OneToMany(() => TransactionEntity, (transaction) => transaction.location, {
    eager: false,
  })
  transactions?: TransactionEntity[];
}
