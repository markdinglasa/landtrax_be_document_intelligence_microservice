import { Column, Entity, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';
import StagingStatusEntity from './staging-status.entity';
import TransactionServiceEntity from './transaction-service.entity';

@Entity(ENTITY.STAGING)
export default class StagingEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Code', type: 'varchar', length: 255, nullable: false })
  code!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'Source', type: 'varchar', length: 255, nullable: false })
  source!: 'Primary' | 'Secondary' | 'Tertiary';

  // STAGING RELATIONSHIPS
  @OneToMany(() => StagingStatusEntity, (stagingStatus) => stagingStatus.staging, {
    eager: false,
  })
  stagingStatuses?: StagingStatusEntity[];

  @OneToMany(() => TransactionServiceEntity, (transactionService) => transactionService.staging, {
    eager: false,
  })
  transactionServices?: TransactionServiceEntity[];
}
