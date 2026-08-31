import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general.entity';
import StagingEntity from './staging.entity';
import TransactionServiceEntity from './transaction-service.entity';

@Entity(ENTITY.STAGING_STATUS)
export default class StagingStatusEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Code', type: 'varchar', length: 255, nullable: false })
  code!: string;

  @Column({ name: 'Description', type: 'varchar', nullable: true })
  description!: string | null;

  // note: some transaction-service status has no staging parent
  @Column({ name: 'StagingId', type: 'varchar', nullable: true })
  stagingId!: string | null;

  @Column({ name: 'IsWithFindings', type: 'bit', nullable: false })
  isWithFindings!: boolean;

  @ManyToOne(() => StagingEntity, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'StagingId', referencedColumnName: 'id' })
  staging?: StagingEntity;

  @OneToMany(
    () => TransactionServiceEntity,
    (transactionService) => transactionService.stagingStatus,
    {
      eager: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'TransactionServiceId', referencedColumnName: 'id' })
  transactionServices?: TransactionServiceEntity[];
}
