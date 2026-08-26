import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { formatToUserDate } from '../utils/date-utils';
import { CourierProviderEntity } from './courier-provider-entity';
import DocumentEntity from './document-entity';
import { BaseEntity } from './general-entity';
import ServiceEntity from './service-entity';
import StagingEntity from './staging-entity';
import StagingStatusEntity from './staging-status-entity';
import StagingStatusFindingEntity from './stating-status-finding-entity';
import TransactionEntity from './transaction-entity';
import TransactionHistoryEntity from './transaction-history';

@Entity(ENTITY.TRANSACTION_SERVICE)
export default class TransactionServiceEntity extends BaseEntity {
  @Column({ name: 'CourierProviderId', type: 'varchar', nullable: true })
  courierProviderId?: string | null;

  @Column({ name: 'TrackingNumber', type: 'varchar', nullable: true })
  trackingNumber?: string | null;

  @Column({ name: 'TransactionServiceNumber', type: 'varchar', length: 255, nullable: false })
  transactionServiceNumber!: string;

  @Column({ name: 'TransactionId', type: 'varchar', nullable: false })
  transactionId!: string; // fk to transaction, a trancsaction may have multiple transaction services

  @Column({ name: 'ServiceId', type: 'varchar', nullable: false })
  serviceId!: string; // fk to service a service have 1:1 with a transaction service

  @Column({ name: 'StagingId', type: 'varchar', nullable: true })
  stagingId!: string | null; // fk to staging a staging have 1:1 with a transaction service

  @Column({ name: 'StagingStatusId', type: 'varchar', nullable: true })
  stagingStatusId!: string | null; // fk to staging a staging have 1:1 with a transaction service

  @Column({ name: 'StagingStatusFindingId', type: 'varchar', nullable: true })
  stagingStatusFindingsId!: string | null; // fk to staging a staging have 1:1 with a transaction service

  @Column({ name: 'DocumentId', type: 'varchar', nullable: true })
  documentId!: string | null; // fk to document a document have 1:1 with a transaction service

  @Column({ name: 'Notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'TAT', type: 'int', nullable: true })
  tat!: number;

  @Column({ name: 'Client', type: 'varchar', nullable: true })
  client!: string | null;

  @Column({ name: 'NotAvailableRequirements', type: 'simple-json', nullable: true })
  notAvailableRequiements?: string[] | null;

  @Column({ name: 'PreparedBy', type: 'varchar', nullable: true })
  preparedBy?: string | null; // fk to user

  @Column({ name: 'CheckBy', type: 'varchar', nullable: true })
  checkBy?: string | null; // fk to user

  @Column({ name: 'IsComplete', type: 'bit', nullable: true })
  isComplete?: boolean | null; // fk to user

  @Column({ name: 'ApprovedBy', type: 'varchar', nullable: true })
  approvedBy?: string | null; // fk to user

  @Column({ name: 'IsEOS', type: 'bit', nullable: true })
  isEOS?: boolean | null;

  @Column({ name: 'Quantity', type: 'int', nullable: true })
  quantity?: number | null;

  @Column({ name: 'Discount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  discount?: number;

  @Column({ name: 'ServiceFee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  serviceFee?: number | null;

  @Column({ name: 'NotesHistory', type: 'simple-json', nullable: true })
  notesHistory?: string | null;

  @Column({ name: 'FindingsHistory', type: 'simple-json', nullable: true })
  findingsHistory?: string | null;

  // TRANSACTION SERVICE RELATIONSHIPS
  @ManyToOne(() => TransactionEntity, (t) => t.transactionServices)
  @JoinColumn({ name: 'TransactionId' })
  transaction?: TransactionEntity;

  @ManyToOne(() => ServiceEntity, (service) => service.transactionServices, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }) // fk to service
  @JoinColumn({ name: 'ServiceId', referencedColumnName: 'id' })
  service?: ServiceEntity;

  @ManyToOne(() => StagingEntity, (staging) => staging.transactionServices, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }) // fk to staging
  @JoinColumn({ name: 'StagingId', referencedColumnName: 'id' })
  staging?: StagingEntity;

  @ManyToOne(() => StagingStatusEntity, (stagingStatus) => stagingStatus.transactionServices, {
    eager: false,
    onDelete: 'NO ACTION',
    onUpdate: 'NO ACTION',
  }) // fk to stagingStatus
  @JoinColumn({ name: 'StagingStatusId', referencedColumnName: 'id' })
  stagingStatus?: StagingStatusEntity;

  @ManyToOne(
    () => StagingStatusFindingEntity,
    (stagingStatusFindings) => stagingStatusFindings.transactionServices,
    {
      eager: false,
      onDelete: 'NO ACTION',
      onUpdate: 'NO ACTION',
    },
  ) // fk to stagingStatus
  @JoinColumn({ name: 'StagingStatusFindingId', referencedColumnName: 'id' })
  stagingStatusFinding?: StagingStatusFindingEntity;

  @OneToMany(() => DocumentEntity, (document) => document.transactionService, {
    eager: false,
  })
  documents!: DocumentEntity[];

  @OneToMany(() => TransactionHistoryEntity, (history) => history.transactionService, {
    eager: false,
  })
  history?: TransactionHistoryEntity[];

  @ManyToOne(() => CourierProviderEntity, (courier) => courier.transactionServices, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  }) // fk to service
  @JoinColumn({ name: 'CourierProviderId', referencedColumnName: 'id' })
  courier?: CourierProviderEntity;

  // virtual columns
  // total eos amount
  eosVAT?: number; // eos vat
  eosAmount?: number; // eos subtotal
  eosDiscountedAmount?: number;
  totalEOSAmount?: number; // eos
  vat?: number; // non-eos vat
  amount?: number; // non-eos subtotal
  discountedAmount?: number;
  totalServiceAmount?: number; // non-eos

  statusName?: string;
  statusCode?: string;
  stagingName?: string;
  stagingCode?: string;
  findingName?: string;
  findingCode?: string;
  serviceName?: string;
  convertedCreatedDate?: string;
  convertedLastModified?: string;
  lastModified?: string;
  completed?: number;
  noRequirements?: number;

  @AfterLoad()
  calculateTotals() {
    this.setEosAmount();
    this.setDiscountedEOSAmount();
    this.setEosVAT();
    this.setTotalEOSAmount();

    this.setAmount();
    this.setDiscountedAmount();
    this.setVat();
    this.setTotalServiceAmount();
    //
    this.setFinding();
    this.setStaging();
    this.setStatus();
    this.setService();
    this.setConvertedDates();
    this.calcServiceSelected();
  }

  setConvertedDates() {
    this.convertedCreatedDate = formatToUserDate(this.createdDate);
    this.convertedLastModified = formatToUserDate(this.updatedDate || this.createdDate);
    this.lastModified = formatToUserDate(this.updatedDate || this.createdDate);
  }

  setEosAmount() {
    this.eosAmount =
      (this.isEOS ?? false)
        ? (this.serviceFee ?? this.service?.price ?? 0) * (this.quantity || 1)
        : 0;
  }
  setDiscountedEOSAmount() {
    this.eosDiscountedAmount =
      (this.eosAmount ?? 0) - (this.eosAmount ?? 0) * ((this.discount ?? 0) / 100);
  }

  setEosVAT() {
    this.eosVAT = (this.eosDiscountedAmount ?? 0) * 0.12;
  }

  setTotalEOSAmount() {
    this.totalEOSAmount = (this.eosDiscountedAmount ?? 0) + (this.eosVAT ?? 0);
  }
  setDiscountedAmount() {
    this.discountedAmount = (this.amount ?? 0) - (this.amount ?? 0) * ((this.discount ?? 0) / 100);
  }
  setVat() {
    this.vat = (this.discountedAmount ?? 0) * 0.12;
  }

  setAmount() {
    this.amount =
      (this.isEOS ?? false)
        ? 0
        : (this.serviceFee ?? this.service?.price ?? 0) * (this.quantity ?? 1);
  }

  setTotalServiceAmount() {
    this.totalServiceAmount = (this.discountedAmount ?? 0) + (this.vat ?? 0);
  }

  setStaging() {
    this.stagingName = this.staging?.name;
    this.stagingCode = this.staging?.code;
  }
  setStatus() {
    this.statusName = this.stagingStatus?.name;
    this.statusCode = this.stagingStatus?.code;
  }
  setFinding() {
    this.findingName = this.stagingStatusFinding?.name;
    this.findingCode = this.stagingStatusFinding?.code;
  }
  setService() {
    this.serviceName = this.service?.name;
  }

  calcServiceSelected() {
    // if match then increment
    this.completed =
      this.service?.serviceChecklists
        ?.filter((checklist) => checklist?.isActive && checklist?.isRequired)
        ?.reduce<number>((acc, r) => {
          return (
            acc +
            (this.documents
              ?.filter((d) => !d.deletedDate)
              .some((upload) => upload?.requirementId == r?.requirementId)
              ? 1
              : 0)
          );
        }, 0) ?? 0;

    this.noRequirements =
      this.service?.serviceChecklists?.filter(
        (checklist) => checklist?.isActive && checklist?.isRequired,
      )?.length || 0;
  }
}
