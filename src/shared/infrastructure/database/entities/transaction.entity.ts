import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Entities } from '../models/general.model';
import CollectionEntity from './collection.entity';
import DocumentEntity from './document.entity';
import { BaseEntity } from './general-entity';
import { RegistryOfDeedEntity } from './location';
import ProposalReferenceEntity from './proposal-reference.entity';
import StagingEntity from './staging.entity';
import TransactionServiceEntity from './transaction-service.entity';
import UserEntity from './user.entity';

@Entity(Entities.TRANSACTION)
export default class TransactionEntity extends BaseEntity {
  @Column({ name: 'UserId', type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ name: 'TransactionNumber', type: 'varchar', length: 255, nullable: true }) // auto-generated, nullable for drafts
  transactionNumber!: string | null;

  @Column({ name: 'Type', type: 'varchar', length: 255, nullable: false }) // fk to transaction type
  type!: TransactionType;

  @Column({ name: 'StagingId', type: 'varchar', nullable: false }) // fk to staging (transaction status)
  stagingId!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'EOSDocument', type: 'text', nullable: true })
  eosDocument!: string | null; // direct URL

  // deprecated
  // transfered to transaction-service hence the tat on transaction is the sum(transactionService.tat)
  @Column({ name: 'TAT', type: 'int', nullable: true })
  tat!: number;

  @Column({ name: 'CompletedAt', type: 'datetime2', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'DeliveryMethod', type: 'varchar', length: 255, nullable: true })
  deliveryMethod?: string | null;

  @Column({ name: 'TATStartDate', type: 'datetime2', nullable: true })
  tatStartDate!: Date | null;

  @Column({ name: 'TATEndDate', type: 'datetime2', nullable: true })
  tatEndDate!: Date | null;

  @Column({ name: 'DeliveryTrackingNumber', type: 'varchar', length: 255, nullable: true })
  deliveryTrackingNumber?: string | null;

  @Column({ name: 'ProposalReferenceNumber', type: 'varchar', length: 255, nullable: true })
  proposalReferenceNumber?: string | null;

  @Column({ name: 'PaidPercentage', type: 'decimal', precision: 10, scale: 2, nullable: true })
  paidPercentage?: number | null;

  @Column({ name: 'PaymentCompleted', type: 'bit', nullable: true })
  paymentCompleted?: boolean | null;

  @Column({ name: 'PaymentStatus', type: 'varchar', nullable: true, default: 'Pending' })
  paymentStatus?: CollectionStatus | null;

  @Column({ name: 'EOSUploaded', type: 'bit', nullable: true })
  eosUploaded?: boolean | null;

  @Column({ name: 'EOSFileUrl', type: 'varchar', length: 500, nullable: true })
  eosFileUrl?: string | null;

  @Column({ name: 'EOSUploadedDate', type: 'datetime2', nullable: true })
  eosUploadedDate?: Date | null;

  @Column({ name: 'EOSUploadedBy', type: 'varchar', length: 255, nullable: true })
  eosUploadedBy?: string | null;

  @Column({ name: 'ApprovedDate', type: 'datetime', nullable: true })
  approvedDate?: Date | null;

  @Column({ name: 'ApprovedBy', type: 'varchar', length: 255, nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'IsEOSApproved', type: 'bit', nullable: true })
  isEOSApproved?: boolean | null;

  // Transaction Deletion Request fields
  @Column({ name: 'DeletionRequested', type: 'bit', nullable: true, default: false })
  deletionRequested?: boolean | null;

  @Column({ name: 'DeletionRequestedBy', type: 'varchar', length: 255, nullable: true })
  deletionRequestedBy?: string | null;

  @Column({ name: 'DeletionRequestedDate', type: 'datetime2', nullable: true })
  deletionRequestedDate?: Date | null;

  @Column({ name: 'DeletionApprovalToken', type: 'varchar', length: 500, nullable: true })
  deletionApprovalToken?: string | null;

  @Column({ name: 'DeletionNote', type: 'nvarchar', length: 2000, nullable: true })
  deletionNote?: string | null;

  @Column({ name: 'DeletionRejectionReason', type: 'nvarchar', length: 2000, nullable: true })
  deletionRejectionReason?: string | null;

  @Column({ name: 'InitialFee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  initialFee!: number | null;

  @Column({ name: 'AdditionalFees', type: 'decimal', precision: 10, scale: 2, nullable: true })
  additionalFees?: number | null;

  @Column({ name: 'DiscountAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount?: number | null;

  @Column({ name: 'VATAmount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  vatAmount?: number | null;

  @Column({ name: 'TotalFee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalFee?: number | null;

  @Column({ name: 'DeliveryAddress', type: 'text', nullable: true })
  deliveryAddress?: string | null;

  @Column({ name: 'RegistryOfDeedId', type: 'varchar', nullable: true })
  registryOfDeedId!: string | null;

  // TRANSCTION RELATIONSHIPS
  @OneToMany(
    () => TransactionServiceEntity,
    (transactionService) => transactionService.transaction,
    {
      eager: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  transactionServices?: TransactionServiceEntity[];

  @OneToMany(() => MayaCheckoutEntity, (mayaCheckout) => mayaCheckout.transaction, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  mayaCheckouts?: MayaCheckoutEntity[];

  // joiin user
  @ManyToOne(() => UserEntity, {
    eager: false,
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId', referencedColumnName: 'id' })
  user?: UserEntity;

  @ManyToOne(() => StagingEntity, {
    eager: true,
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  }) // fk to staging (transaction status)
  @JoinColumn({ name: 'StagingId', referencedColumnName: 'id' })
  staging?: StagingEntity;

  @ManyToOne(() => RegistryOfDeedEntity, {
    eager: true,
    onDelete: 'NO ACTION',
    onUpdate: 'CASCADE',
  }) // fk to staging (transaction status)
  @JoinColumn({ name: 'RegistryOfDeedId', referencedColumnName: 'id' })
  location?: RegistryOfDeedEntity;

  @OneToMany(() => DocumentEntity, (document) => document.transaction, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }) // fk to document
  documents?: DocumentEntity[];

  @OneToMany(() => CollectionEntity, (collections) => collections.transactions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  collections?: CollectionEntity[];

  @OneToMany(() => FeedbackEntity, (feedback) => feedback.transaction, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  feedbacks?: FeedbackEntity[];

  @OneToMany(() => CartEntity, (cart) => cart.transaction, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  carts?: CartEntity[];

  @ManyToOne(() => ProposalReferenceEntity, (proposalReference) => proposalReference.transaction, {
    eager: false,
    createForeignKeyConstraints: false, // ReferenceNumber is no longer unique; maintain association via column only
  })
  @JoinColumn({ name: 'ProposalReferenceNumber', referencedColumnName: 'referenceNumber' })
  proposalReference?: ProposalReferenceEntity;

  @OneToMany(() => TransactionHistoryEntity, (history) => history.transaction, {
    eager: false,
  })
  history?: TransactionHistoryEntity[];

  @OneToMany(() => RecipientEntity, (recipient) => recipient.transaction, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  recipients?: RecipientEntity[];

  // Manual parent-child relationship handling (no FK constraint)
  // parent: TransactionEntity; // Removed to avoid cascade issues
  // children: TransactionEntity[]; // Removed to avoid cascade issues

  // this fields are not stored in schema/database
  lodgeBy?: string;
  stagingName?: string;
  stagingCode?: string;
  entityCode?: string;
  entityOwner?: string;
  totalAmount?: number;
  companyName?: string | null;
  registryOfDeedName?: string;
  companyId?: string;
  noCompleted?: number;
  lastModified?: Date;
  serviceCount?: number;
  client?: string;
  clientEmail?: string;
  route?: string;
  requestorName?: string;
  requestorEmail?: string;
  convertedCreatedDate?: string;
  convertedLastModified?: string;
  isAllServicesMatch?: boolean;
  lineItems?: CollectionEntity[] | TransactionServiceEntity[];

  // total eos amount
  eosVAT?: number; // eos vat
  eosAmount?: number; // eos subtotal
  totalEOSAmount?: number; // eos
  vat?: number; // non-eos vat
  amount?: number; // non-eos subtotal
  totalServiceAmount?: number; // non-eos
  totalAmountPaid?: number;
  outstandingBalance?: number;
  grossAmount?: number; // used in maya-checkout

  @AfterLoad()
  calculateTotals() {
    this.setRequestor();
    this.setCompanyName();
    this.setConvertedCreatedDate();
    this.setEosAmount();
    this.setAmount();
    this.setEosVAT();
    this.setVat();
    this.setTotalEOSAmount();
    this.setTotalServiceAmount();
    this.setRoute();
    this.setServiceCount();
    this.setStaging();
    this.setIsAllServicesMatch();
    this.setAmountPaid();
    this.setOutstandingBalance();
  }
  //
  setServiceCount() {
    this.serviceCount =
      this.transactionServices?.filter((ts) => !ts.deletedDate && !ts.isEOS).length || 0;
  }
  setRoute() {
    this.route = this.user?.type === USER_TYPE.ADMINISTRATOR ? '/administrator' : '/client';
  }
  setRequestor() {
    this.requestorName = (this.user?.firstName ?? '') + ' ' + (this.user?.lastName ?? '');
    this.requestorEmail = this.user?.email;
  }

  setCompanyName() {
    this.companyName = this.user?.companyName;
  }

  setConvertedCreatedDate() {
    this.convertedCreatedDate = formatToUserDate(this.createdDate);
  }

  setEosAmount() {
    this.eosAmount = Number(
      (
        this.transactionServices
          ?.filter((ts) => !ts.deletedDate && ts.isEOS)
          .reduce((acc, ts) => {
            const price = ts.serviceFee ?? ts.service?.price ?? 0;
            const quantity = ts.quantity ?? 1;
            const gross = price * quantity;
            const discount = ts.discount ?? 0;
            const net = gross - gross * (discount / 100);
            return acc + net;
          }, 0) ?? 0
      )?.toFixed(2),
    );
  }

  setAmount() {
    this.amount = Number(
      (
        this.transactionServices
          ?.filter((ts) => !ts.deletedDate && !ts.isEOS)
          .reduce((acc, ts) => {
            const price = ts.serviceFee ?? ts.service?.price ?? 0;
            const quantity = ts.quantity ?? 1;
            const gross = price * quantity;
            const discount = ts.discount ?? 0;
            const net = gross - gross * (discount / 100);
            return acc + net;
          }, 0) ?? 0
      )?.toFixed(2),
    );

    // collects the unit-price * qty
    this.grossAmount = Number(
      (
        this.transactionServices
          ?.filter((ts) => !ts.deletedDate && !ts.isEOS)
          .reduce((acc, ts) => {
            const price = ts.serviceFee ?? ts.service?.price ?? 0;
            const quantity = ts.quantity ?? 1;
            const gross = price * quantity;
            return acc + gross;
          }, 0) ?? 0
      )?.toFixed(2),
    );
  }

  setEosVAT() {
    this.eosVAT = Number(
      (
        this.transactionServices
          ?.filter((ts) => !ts.deletedDate && ts.isEOS)
          .reduce((acc, ts) => {
            const price = ts.serviceFee ?? ts.service?.price ?? 0;
            const quantity = ts.quantity ?? 1;
            const gross = price * quantity;
            const discount = ts.discount ?? 0;
            const net = gross - gross * (discount / 100);
            return acc + net * 0.12;
          }, 0) ?? 0
      )?.toFixed(2),
    );
  }

  setVat() {
    this.vat = Number(
      (
        this.transactionServices
          ?.filter((ts) => !ts.deletedDate && !ts.isEOS)
          .reduce((acc, ts) => {
            const price = ts.serviceFee ?? ts.service?.price ?? 0;
            const quantity = ts.quantity ?? 1;
            const gross = price * quantity;
            const discount = ts.discount ?? 0;
            const net = gross - gross * (discount / 100);
            return acc + net * 0.12;
          }, 0) ?? 0
      )?.toFixed(2),
    );
  }

  setTotalEOSAmount() {
    this.totalEOSAmount = Number(((this.eosAmount ?? 0) + (this.eosVAT ?? 0))?.toFixed(2));
  }

  setTotalServiceAmount() {
    this.totalServiceAmount = Number(((this.amount ?? 0) + (this.vat ?? 0))?.toFixed(2));
  }

  setAmountPaid() {
    this.totalAmountPaid = Number(
      (
        this.collections
          ?.filter((c) => !c.deletedDate)
          .reduce((acc, c) => {
            const amount = c.amount ?? 0;
            return acc + amount;
          }, 0) ?? 0
      ).toFixed(2),
    );
  }
  setOutstandingBalance() {
    this.outstandingBalance = Number(
      ((this?.totalServiceAmount || 0) - (this?.totalAmountPaid || 0))?.toFixed(2),
    );
  }

  setStaging() {
    this.stagingName = this.staging?.name;
    this.stagingCode = this.staging?.code;
  }

  setIsAllServicesMatch() {
    const eosServices: TransactionServiceEntity[] =
      this.transactionServices?.filter((ts) => ts?.isEOS) || [];

    // all transaction services should be the same as eos-services
    const transactionServices: TransactionServiceEntity[] =
      this.transactionServices?.filter((ts) => !ts?.isEOS) || [];

    if (transactionServices.length === 0 || eosServices.length === 0) {
      this.isAllServicesMatch = true;
      return;
    }

    const getGroupKey = (ts: TransactionServiceEntity) => {
      const name = ts.serviceName || ts.service?.name || '';
      const fee = ts.serviceFee ?? ts.service?.price ?? 0;
      const discount = ts.discount ?? 0;
      return `${name}|${fee}|${discount}`;
    };

    interface GroupStats {
      quantity: number;
      totalAmount: number;
    }

    const eosGroups = new Map<string, GroupStats>();
    for (const eos of eosServices) {
      const key = getGroupKey(eos);
      const stats = eosGroups.get(key) || { quantity: 0, totalAmount: 0 };
      stats.quantity += eos.quantity ?? 1;
      stats.totalAmount += eos.totalEOSAmount ?? 0;
      eosGroups.set(key, stats);
    }

    const tsGroups = new Map<string, GroupStats>();
    for (const ts of transactionServices) {
      const key = getGroupKey(ts);
      const stats = tsGroups.get(key) || { quantity: 0, totalAmount: 0 };
      stats.quantity += ts.quantity ?? 1;
      stats.totalAmount += ts.totalServiceAmount ?? 0;
      tsGroups.set(key, stats);
    }

    if (eosGroups.size !== tsGroups.size) {
      this.isAllServicesMatch = false;
      return;
    }

    let isMatch = true;
    for (const [key, eosStats] of eosGroups.entries()) {
      const tsStats = tsGroups.get(key);
      if (!tsStats) {
        isMatch = false;
        break;
      }
      if (eosStats.quantity !== tsStats.quantity) {
        isMatch = false;
        break;
      }
      if (Math.abs(eosStats.totalAmount - tsStats.totalAmount) > 0.01) {
        isMatch = false;
        break;
      }
    }

    this.isAllServicesMatch = isMatch;
  }
}
