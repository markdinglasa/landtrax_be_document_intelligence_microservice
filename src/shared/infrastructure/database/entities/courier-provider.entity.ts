import { Column, Entity, OneToMany } from 'typeorm';
import { Entities } from '../models/general.model';
import { BaseEntity } from './general.entity';
import TransactionServiceEntity from './transaction-service.entity';

@Entity(Entities.COURIER_PROVIDER)
export default class CourierProviderEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'ContactNumber', type: 'varchar', length: 50, nullable: true })
  contactNumber!: string | null;

  @Column({ name: 'ContactEmail', type: 'varchar', length: 255, nullable: true })
  contactEmail!: string | null;

  @Column({ name: 'Website', type: 'varchar', length: 500, nullable: true })
  website!: string | null;

  @Column({ name: 'TrackingUrlTemplate', type: 'varchar', length: 500, nullable: true })
  trackingUrlTemplate!: string | null;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;

  // RELATIONS
  @OneToMany(() => TransactionServiceEntity, (transactionService) => transactionService.service, {
    eager: false,
  })
  transactionServices?: TransactionServiceEntity[];
}
