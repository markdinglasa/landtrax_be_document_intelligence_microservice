import { Column, Entity, JoinColumn, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';
import TransactionServiceEntity from './transaction-service-entity';

@Entity(ENTITY.STAGING_STATUS_FINDING)
export default class StagingStatusFindingEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Code', type: 'varchar', length: 255, nullable: false })
  code!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(
    () => TransactionServiceEntity,
    (transactionService) => transactionService.stagingStatusFinding,
    {
      eager: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'TransactionServiceId', referencedColumnName: 'id' })
  transactionServices?: TransactionServiceEntity[];
}
