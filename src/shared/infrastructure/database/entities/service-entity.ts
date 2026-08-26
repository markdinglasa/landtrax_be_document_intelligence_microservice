import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { CategoryEntity } from './category-entity';
import { BaseEntity } from './general-entity';
import RequirementMappingEntity from './requirement-mapping-entity';
import ServiceChecklistEntity from './service-checklist-entity';
import TransactionServiceEntity from './transaction-service-entity';

@Entity(ENTITY.SERVICE)
export default class ServiceEntity extends BaseEntity {
  @Column({ name: 'ServiceCode', type: 'varchar', nullable: false })
  serviceCode!: string;

  @Column({ name: 'Name', type: 'varchar', nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'Type', type: 'varchar', nullable: false })
  type!: string;

  @Column({ name: 'Price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  price!: number;

  @Column({ name: 'IsActive', type: 'bit', default: 1 })
  isActive!: boolean;

  @Column({ name: 'TurnaroundDays', type: 'int', nullable: false })
  turnaroundDays!: number;

  @Column({ name: 'CategoryId', type: 'varchar', nullable: false })
  categoryId!: string;

  // SERVICE RELATIONSHIP
  @OneToMany(() => ServiceChecklistEntity, (serviceChecklist) => serviceChecklist.service, {
    eager: false,
  })
  serviceChecklists?: ServiceChecklistEntity[];

  @OneToMany(() => RequirementMappingEntity, (requirementMapping) => requirementMapping.service, {
    eager: false,
  })
  requirementMappings?: RequirementMappingEntity[];

  @OneToMany(() => TransactionServiceEntity, (transactionService) => transactionService.service, {
    eager: false,
  })
  transactionServices?: TransactionServiceEntity[];

  @ManyToOne(() => CategoryEntity, (category) => category.services, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }) // fk to service
  @JoinColumn({ name: 'CategoryId', referencedColumnName: 'id' })
  category?: CategoryEntity;
}
