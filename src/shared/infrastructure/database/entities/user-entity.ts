import { mainRoleTransform } from 'src/utils';
import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { USER_TYPE } from '../common';
import { ENTITY } from '../models/general-model';
import type { UserModel } from '../models/masterfile-model';
import { type UserStatus } from '../modules/user/types';
import AddressEntity from './address-entity';
import AuditTrailEntity from './audit-trail-entity';
import CartEntity from './cart-entity';
import DocumentEntity from './document-entity';
import EmailTemplateRecipientEntity from './email-template-recipient-entity';
import { LineEntity } from './general-entity';
import NotificationEntity from './notification-entity';
import { RegistryOfDeedEntity } from './registry-of-deed-entity';
import TransactionEntity from './transaction-entity';
import UserCompanyEntity from './user-company-entity';
import UserRoleEntity from './user-role-entity';
import WidgetEntity from './widget-entity';

@Entity(ENTITY.USER)
export default class UserEntity extends LineEntity implements UserModel {
  @Column({ name: 'Preferences', type: 'text', nullable: true })
  preferences?: string | null;

  @Column({ name: 'Status', type: 'varchar', length: 50, nullable: false })
  status!: UserStatus;

  @Column({ name: 'Type', type: 'varchar', length: 50, nullable: false })
  type!: USER_TYPE;

  @Column({ name: 'Username', type: 'varchar', length: 255, nullable: false, unique: true })
  username!: string;

  @Column({ name: 'Password', type: 'text', nullable: true })
  password?: string | null;

  @Column({ name: 'ProfilePictureURL', type: 'text', nullable: true })
  profilePictureURL!: string | null;

  @Column({ name: 'FirstName', type: 'varchar', length: 255, nullable: false })
  firstName!: string;

  @Column({ name: 'MiddleName', type: 'varchar', length: 255, nullable: true })
  middleName!: string | null;

  @Column({ name: 'LastName', type: 'varchar', length: 255, nullable: false })
  lastName!: string;

  @Column({ name: 'DateOfBirth', type: 'datetime', nullable: false })
  dateOfBirth!: Date;

  @Column({ name: 'Nationality', type: 'varchar', length: 100, nullable: false })
  nationality!: string;

  @Column({ name: 'StreetAddressLine1', type: 'varchar', length: 255, nullable: false })
  streetAddressLine1!: string;

  @Column({ name: 'StreetAddressLine2', type: 'varchar', length: 255, nullable: true })
  streetAddressLine2!: string | null;

  @Column({ name: 'City', type: 'varchar', length: 255, nullable: false })
  city!: string;

  @Column({ name: 'Province', type: 'varchar', length: 255, nullable: false })
  province!: string;

  @Column({ name: 'PostalCode', type: 'varchar', length: 50, nullable: false })
  postalCode!: string;

  @Column({ name: 'Country', type: 'varchar', length: 255, nullable: false })
  country!: string;

  @Column({ name: 'PhoneNumber', type: 'varchar', length: 50, nullable: false, unique: true })
  phoneNumber!: string;

  @Column({ name: 'Email', type: 'varchar', length: 255, nullable: false, unique: true })
  email!: string;

  @Column({ name: 'EmailVerifiedDate', type: 'datetime', nullable: true })
  emailVerifiedDate!: Date;

  @Column({ name: 'PhoneVerifiedDate', type: 'datetime', nullable: true })
  phoneVerifiedDate!: Date;

  @Column({ name: 'FailedAttempt', type: 'int', nullable: false })
  failedAttempt!: number;

  @Column({ name: 'PasswordChangedDate', type: 'datetime', nullable: true })
  passwordChangedDate!: Date;

  @Column({ name: 'SessionVersionDate', type: 'datetime', nullable: true })
  sessionVersionDate!: Date;

  @Column({ name: 'SessionEvictionAt', type: 'datetime', nullable: true })
  sessionEvictionAt?: Date | null;

  @Column({ name: 'TwoFactorEnabled', type: 'bit', nullable: true })
  twoFactorEnabled!: boolean;

  @Column({ name: 'TwoFactorSecret', type: 'varchar', length: 255, nullable: true })
  twoFactorSecret!: string;

  @Column({ name: 'BackUpCodes', type: 'text', nullable: true })
  backUpCodes!: string;

  @Column({ name: 'BoardResolutionUrl', type: 'text', nullable: true })
  boardResolutionUrl!: string | null;

  @Column({ name: 'RegistryOfDeedId', type: 'varchar', nullable: true })
  registryOfDeedId!: string | null;

  @Column({ name: 'IsApproved', type: 'bit', nullable: true })
  isApproved!: boolean;

  @Column({ name: 'ApprovedDate', type: 'datetime', nullable: true })
  approvedDate!: Date;

  @Column({ name: 'MFAEnabled', type: 'bit', nullable: true })
  mfaEnabled!: boolean;

  @Column({ name: 'MFASecret', type: 'text', nullable: true })
  mfaSecret!: string;

  @Column({ name: 'MFAMethod', type: 'varchar', nullable: true })
  mfaMethod!: string;

  @Column({ name: 'PasswordHistory', type: 'text', nullable: true })
  passwordHistory!: string | null;

  @Column({ name: 'DeletionReason', type: 'text', nullable: true })
  deletionReason?: string | null;

  @Column({ name: 'DeletionRequestedBy', type: 'varchar', length: 36, nullable: true })
  deletionRequestedBy?: string | null;

  @Column({ name: 'DeletionRequestedAt', type: 'datetime', nullable: true })
  deletionRequestedAt?: Date | null;

  @Column({ name: 'RejectionReason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'LastLoginDate', type: 'datetime', nullable: true })
  lastLoginDate?: Date | null;

  @Column({ name: 'IsPasswordExpired', type: 'bit', default: false })
  isPasswordExpired!: boolean;

  // USER RELATIONSHIPS
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user, {
    eager: false,
  })
  userRoles?: UserRoleEntity[];

  @OneToMany(() => AuditTrailEntity, (auditTrail) => auditTrail.user, {
    eager: false,
  })
  auditTrails?: AuditTrailEntity[];

  @OneToMany(() => UserCompanyEntity, (userCompany) => userCompany.user, {
    eager: false,
  })
  userCompanies?: UserCompanyEntity[];

  @OneToMany(() => NotificationEntity, (notification) => notification.user, {
    eager: false,
  })
  notifications?: NotificationEntity[];

  @OneToMany(
    () => EmailTemplateRecipientEntity,
    (emailTemplateRecipient) => emailTemplateRecipient.user,
    {
      eager: false,
    },
  )
  emailTemplateRecipients?: EmailTemplateRecipientEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.user, {
    eager: false,
  })
  documents?: DocumentEntity[];

  @OneToMany(() => TransactionEntity, (transaction) => transaction.createdByUser, {
    eager: false,
  })
  transactions?: TransactionEntity[];

  @OneToMany(() => WidgetEntity, (widget) => widget.user, {
    eager: false,
  })
  widgets?: WidgetEntity[];

  @OneToMany(() => AddressEntity, (addresses) => addresses.user, {
    eager: false,
  })
  addresses?: AddressEntity[];

  @ManyToOne(() => RegistryOfDeedEntity, (registryOfDeed) => registryOfDeed.users, {
    eager: false,
  })
  @JoinColumn({ name: 'RegistryOfDeedId' })
  location?: RegistryOfDeedEntity;

  @OneToMany(() => CartEntity, (cart) => cart.user, {
    eager: false,
  })
  carts?: CartEntity[];

  @OneToMany(() => DocumentEntity, (document) => document.createdByUser, {
    eager: false,
  })
  createdDocuments?: DocumentEntity[];

  // virtual field
  companyName?: string | null;
  entityCode?: string | null;
  permissions?: string[];
  fullName?: string;
  name?: string;
  mainRole?: string;

  @AfterLoad()
  calculateTotals() {
    this.setCompanyName();
    this.setFullname();
    this.setMainRole();
  }
  setCompanyName() {
    // each user can only have 1 company
    this.companyName =
      this.userCompanies && this.userCompanies.length > 0
        ? this.userCompanies?.[0].company?.name
        : null;
    this.entityCode =
      this.userCompanies && this.userCompanies.length > 0
        ? this.userCompanies?.[0].company?.entityCode
        : null;
  }
  setFullname() {
    // each user can only have 1 company
    this.fullName = this.firstName + ' ' + this.lastName || 'unknown user';
  }
  setMainRole() {
    const role =
      this.userRoles?.toSorted((a, b) => a.createdDate?.getTime() - b?.createdDate?.getTime())[0]
        ?.role?.name || '';
    this.mainRole = mainRoleTransform(role);
  }
}
