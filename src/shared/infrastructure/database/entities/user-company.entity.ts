import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import CompanyEntity from './company.entity';
import { LineEntity } from './general-entity';
import UserEntity from './user.entity';

@Entity(ENTITY.USER_COMPANY)
//@Unique('UQ_UserCompany_UserId_CompanyId', ['userId', 'companyId'])
export default class UserCompanyEntity extends LineEntity {
  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'CompanyId', type: 'varchar', nullable: false })
  companyId!: string;

  @Column({ name: 'IsPrimaryAdmin', type: 'varchar', nullable: false })
  isPrimaryAdmin!: string;

  // USER COMPANY RELATIONSHIPS
  @ManyToOne(() => UserEntity, (user) => user.userCompanies, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId' })
  user!: UserEntity;

  @ManyToOne(() => CompanyEntity, (company) => company.userCompanies, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'CompanyId' })
  company!: CompanyEntity;
}
