import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general.entity';
import RequirementEntity from './requirement.entity';
import ServiceEntity from './service-catalog.entity';

@Entity(ENTITY.SERVICE_CHECKLIST)
//@Unique('UQ_ServiceChecklist_ServiceId_RequirementId', ['serviceId', 'requirementId'])
export default class ServiceChecklistEntity extends LineEntity {
  @Column({ name: 'ServiceId', type: 'varchar', nullable: false })
  serviceId!: string;

  @Column({ name: 'RequirementId', type: 'varchar', nullable: false })
  requirementId!: string;

  @Column({ name: 'IsRequired', type: 'bit', nullable: true })
  isRequired!: boolean;

  @Column({ name: 'Sort', type: 'int', nullable: true })
  sort!: number | null;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;

  // SERVICE CHECKLIST RELATIONSHIPS
  @ManyToOne(() => ServiceEntity, (service) => service.serviceChecklists, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ServiceId', referencedColumnName: 'id' })
  service?: ServiceEntity;

  @ManyToOne(() => RequirementEntity, (requirement) => requirement.serviceChecklists, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'RequirementId', referencedColumnName: 'id' })
  requirement?: RequirementEntity;
}
