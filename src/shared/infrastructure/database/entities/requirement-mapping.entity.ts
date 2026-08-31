import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general.entity';
import SourceRequirementEntity from './requirement.entity';
import ServiceEntity from './service-catalog.entity';

@Entity(ENTITY.REQUIREMENT_MAPPING)
export default class RequirementMappingEntity extends LineEntity {
  @Column({ name: 'SourceRequirementId', type: 'uniqueidentifier', nullable: false })
  sourceRequirementId!: string;

  @Column({ name: 'TargetRequirementId', type: 'uniqueidentifier', nullable: false })
  targetRequirementId!: string;

  @Column({ name: 'ServiceId', type: 'uniqueidentifier', nullable: true })
  serviceId!: string | null;

  @Column({ name: 'SourceFieldName', type: 'varchar', nullable: false })
  sourceFieldName!: string;

  @Column({ name: 'TargetFieldName', type: 'varchar', nullable: false })
  targetFieldName!: string;

  @Column({ name: 'Priority', type: 'int', nullable: false })
  priority!: number;

  @ManyToOne(() => SourceRequirementEntity, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'SourceRequirementId', referencedColumnName: 'id' })
  sourceRequirement!: SourceRequirementEntity;
  // fk on target requirement is remove hence it causes a circular dependency

  @ManyToOne(() => ServiceEntity, {
    eager: false,
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'ServiceId', referencedColumnName: 'id' })
  service!: ServiceEntity | null;

  requirementName?: string;
  requirementType?: string;
  isOptional?: boolean;
  targetRequirement?: { id?: string; name?: string; placeholder?: string | null };
}
