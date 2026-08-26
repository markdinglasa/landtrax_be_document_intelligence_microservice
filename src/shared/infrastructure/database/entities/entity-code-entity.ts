import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { EntityCodeStatus } from '../modules/user/constants/entity-code-status.enum';
import CompanyEntity from './company-entity';
import { BaseEntity } from './general-entity';
import ProposalReferenceEntity from './proposal-reference-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.ENTITY_CODE)
export default class EntityCodeEntity extends BaseEntity {
  @Column({ name: 'Code', type: 'varchar', length: 50, nullable: false, unique: true })
  code!: string;

  @Column({ name: 'CompanyId', type: 'varchar', nullable: false, unique: true })
  companyId!: string;

  @Column({
    name: 'Status',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: EntityCodeStatus.CREATED,
  })
  status!: EntityCodeStatus;

  @Column({ name: 'ExpiresAt', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'AccountOwnerId', type: 'varchar', nullable: false })
  accountOwnerId!: string;

  @ManyToOne(() => UserEntity, {
    eager: false,
  })
  @JoinColumn({ name: 'AccountOwnerId' })
  accountOwner?: UserEntity;

  @OneToOne(() => CompanyEntity, (company) => company.entityCodeRecord, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'CompanyId' })
  company?: CompanyEntity;

  @OneToMany(() => ProposalReferenceEntity, (pr) => pr.entityCode, {
    eager: false,
  })
  proposalReferences!: ProposalReferenceEntity[];

  // virtual fields
  companyName?: string;
  companyEmail?: string;
  accountOwnerName?: string;

  @AfterLoad()
  setFields() {
    this.setCompanyName();
    this.setAccountOwner();
  }

  setCompanyName() {
    this.companyName = this.company?.name || '--';
    this.companyEmail = this.company?.email || '--';
  }
  setAccountOwner() {
    this.accountOwnerName = this.accountOwner?.firstName + ' ' + this.accountOwner?.lastName;
  }
}
