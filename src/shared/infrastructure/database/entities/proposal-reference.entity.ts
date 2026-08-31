import { ENTITY } from '../models/general-model';
import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import CompanyEntity from './company.entity';
import EntityCodeEntity from './entity-code.entity';
import { BaseEntity } from './general.entity';
import TransactionEntity from './transaction.entity';

@Entity(ENTITY.PROPOSAL_REFERENCE)
export default class ProposalReferenceEntity extends BaseEntity {
  @Column({ name: 'CompanyId', type: 'varchar', nullable: false })
  companyId!: string;

  @Column({ name: 'ReferenceNumber', type: 'varchar', nullable: false })
  referenceNumber!: string;

  @Column({ name: 'Status', type: 'varchar', nullable: false })
  status!: string;

  @Column({ name: 'EntityCodeId', type: 'varchar', nullable: true })
  entityCodeId!: string | null;

  // PROPOSAL REFERENCE RELATIONSHIPS
  @ManyToOne(() => CompanyEntity, (company) => company.proposalReferences, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'CompanyId' })
  company?: CompanyEntity;

  @ManyToOne(() => EntityCodeEntity, (entityCode) => entityCode.proposalReferences, {
    eager: false,
    createForeignKeyConstraints: false, // avoid FK constraint to prevent sync failure; association maintained via column
  })
  @JoinColumn({ name: 'EntityCodeId' })
  entityCode?: EntityCodeEntity | null;

  // fk to transaction (inverse side - FK lives in Transaction.ProposalReferenceNumber)
  @OneToMany(() => TransactionEntity, (transaction) => transaction.proposalReference, {
    eager: true,
    createForeignKeyConstraints: false,
  })
  transaction?: TransactionEntity[];

  // virtual fields
  transactionNumber?: string | null;
  transactionId?: string | null;
  isUsed?: boolean;

  @AfterLoad()
  setFields() {
    this.setTransactionNumber();
    this.setTransactionId();
    this.setIsUsed();
  }

  setTransactionNumber() {
    //find the transactioons that are not in DRAFT staging, if any, then set the transaction number to the first one found, otherwise set it to null
    this.transactionNumber =
      this.transaction?.find((tx) => tx.staging?.code !== 'DRAFT')?.transactionNumber || null;
  }
  setTransactionId() {
    //find the transactioons that are not in DRAFT staging, if any, then set the transaction number to the first one found, otherwise set it to null
    this.transactionId = this.transaction?.find((tx) => tx.staging?.code !== 'DRAFT')?.id || null;
  }
  setIsUsed() {
    // check if any transaction relation has a staging code that is not DRAFT, if yes, then this proposal reference is used
    this.isUsed = this.transaction?.some((tx) => tx.staging?.code !== 'DRAFT') ?? false;
  }
}
