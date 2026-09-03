import { BusinessType } from '../../../common/status.js';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { Entities } from '../models/general.model';
import EntityCodeEntity from './entity-code.entity';
import { BaseEntity } from './general.entity';
import ProposalReferenceEntity from './proposal-reference.entity';
import UserCompanyEntity from './user-company.entity';

@Entity(Entities.COMPANY)
export default class CompanyEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', length: 255, nullable: false, unique: true })
  name!: string;

  @Column({ name: 'Email', type: 'varchar', length: 255, nullable: false, unique: true })
  email!: string;

  @Column({ name: 'EntityCode', type: 'varchar', length: 50, nullable: true, unique: true })
  entityCode!: string | null;

  @Column({ name: 'BusinessRegistrationNumber', type: 'varchar', nullable: true })
  businessRegistrationNumber!: string | null;

  @Column({ name: 'TaxIdentificationNumber', type: 'varchar', nullable: true })
  taxIdentificationNumber!: string | null;

  @Column({ name: 'DateEstablish', type: 'date', nullable: true })
  dateEstablish!: Date | null;

  @Column({ name: 'BusinessType', type: 'varchar', nullable: true })
  businessType!: BusinessType | null;

  @Column({ name: 'Industry', type: 'varchar', nullable: true })
  industry!: string | null;

  @Column({ name: 'RequirementDocument', type: 'text', nullable: true })
  requirementDocument!: string | null;

  @Column({ name: 'StreetAddressLine1', type: 'varchar', nullable: true })
  streetAddressLine1!: string | null;

  @Column({ name: 'StreetAddressLine2', type: 'varchar', nullable: true })
  streetAddressLine2!: string | null;

  @Column({ name: 'City', type: 'varchar', nullable: true })
  city!: string | null;

  @Column({ name: 'Province', type: 'varchar', nullable: true })
  province!: string | null;

  @Column({ name: 'Barangay', type: 'varchar', nullable: true })
  barangay!: string | null;

  @Column({ name: 'PostalCode', type: 'varchar', nullable: true })
  postalCode!: string | null;

  @Column({ name: 'Country', type: 'varchar', nullable: true })
  country!: string | null;

  @Column({ name: 'PhoneNumber', type: 'varchar', nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'Branch', type: 'varchar', nullable: true })
  branch!: string | null;

  // COMPANY RELATIONSHIPS
  @OneToMany(() => UserCompanyEntity, (userCompany) => userCompany.company, {
    eager: false,
  })
  userCompanies?: UserCompanyEntity[];

  @OneToMany(() => ProposalReferenceEntity, (proposalReference) => proposalReference.company, {
    eager: false,
  })
  proposalReferences?: ProposalReferenceEntity[];

  @OneToOne(() => EntityCodeEntity, (entityCode) => entityCode.company, {
    eager: false,
  })
  entityCodeRecord?: EntityCodeEntity | null;
}
