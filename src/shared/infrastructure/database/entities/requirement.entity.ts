export type RequirementType = "DOCUMENT" | "INFORMATION";

import { ENTITY } from '../models/general-model';
import { Column, Entity, OneToMany } from 'typeorm';
import DocumentEntity from './document.entity';
import { BaseEntity } from './general.entity';
import RequirementMappingEntity from './requirement-mapping.entity';
import ServiceChecklistEntity from './service-checklist.entity';

@Entity(ENTITY.REQUIREMENT)
export default class RequirementEntity extends BaseEntity {
  @Column({ name: 'RequirementCode', type: 'varchar', length: 255, nullable: false })
  requirementCode!: string;

  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'Type', type: 'varchar', length: 255, nullable: false })
  type!: RequirementType;

  @Column({ name: 'IsActive', type: 'bit', nullable: false, default: true })
  isActive!: boolean;

  //@Column({ name: 'IsRequired', type: 'bit', nullable: false, default: false })
  isRequired?: boolean;

  //@Column({ name: 'SortOrder', type: 'int', nullable: false, default: 0 })
  sortOrder?: number;

  @Column({ name: 'ServiceSpecificInstructions', type: 'text', nullable: true, default: '' })
  serviceSpecificInstructions?: string | null;

  @Column({ name: 'Instructions', type: 'text', nullable: true, default: '' })
  instructions?: string | null;

  @Column({ name: 'AllowsRequest', type: 'bit', nullable: false, default: true })
  allowsRequest?: boolean;

  @Column({ name: 'AcceptedFileTypes', type: 'text', nullable: true, default: 'jpeg,jpg,png,pdf' })
  acceptedFileTypes!: string | null;

  @Column({ name: 'AcceptedGovernmentIds', type: 'text', nullable: true, default: null })
  acceptedGovernmentIds!: string | null;

  @Column({ name: 'MaxFileSize', type: 'int', nullable: true, default: 250 })
  maxFileSize!: number | null;

  @Column({ name: 'AllowMultipleFiles', type: 'bit', nullable: false, default: true })
  allowMultipleFiles?: boolean;

  @Column({ name: 'MinFiles', type: 'int', nullable: true, default: null })
  minFiles!: number | null;

  @Column({ name: 'MaxFiles', type: 'int', nullable: true, default: 1 })
  maxFiles!: number | null;

  @Column({
    name: 'FileNameFormat',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'File naming convention for uploaded documents',
  })
  fileNameFormat!: string | null;

  @Column({
    name: 'IsOptional',
    type: 'bit',
    nullable: false,
    default: false,
    comment: 'For INFORMATION type: whether OCR can skip this field without failing validation',
  })
  isOptional!: boolean;

  @Column({
    name: 'Placeholder',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Placeholder text for INFORMATION type input fields',
  })
  placeholder!: string | null;

  @OneToMany(() => ServiceChecklistEntity, (serviceChecklist) => serviceChecklist.requirement, {
    eager: false,
  })
  serviceChecklists?: ServiceChecklistEntity[];

  @OneToMany(
    () => RequirementMappingEntity,
    (requirementMapping) => requirementMapping.sourceRequirement,
    { eager: false },
  )
  sourceRequirementMappings?: RequirementMappingEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.requirement, {
    eager: false,
    cascade: ['insert', 'update', 'remove'],
  })
  documents?: DocumentEntity[];
}
