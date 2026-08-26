import { AfterLoad, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { formatToUserDate } from '../utils/date-utils';
import DocumentTagEntity from './document-tag-entity';
import ExtractedFieldsEntity from './extracted-fields-entity';
import { LineEntity } from './general-entity';
import RecipientDocumentsEntity from './recipient-documents-entity';
import RequirementEntity from './requirement-entity';
import TransactionEntity from './transaction-entity';
import TransactionServiceEntity from './transaction-service-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.DOCUMENT)
export default class DocumentEntity extends LineEntity {
  @Column({ name: 'FileURL', type: 'varchar', length: 500, nullable: false })
  fileURL!: string;

  @Column({ name: 'Category', type: 'varchar', length: 255, nullable: false })
  category!: string;

  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string; // FK to user, who uploads the document

  @Column({ name: 'FileSize', type: 'bigint', nullable: false })
  fileSize!: number;

  @Column({ name: 'OriginalFileName', type: 'varchar', length: 255, nullable: true })
  originalFileName?: string;

  @Column({ name: 'TransactionId', type: 'varchar', nullable: true })
  transactionId!: string; // parent transaction, fk to transaction

  @Column({ name: 'TransactionServiceId', type: 'varchar', nullable: true }) // FileCategory
  transactionServiceId?: string | null; // child transaction, fk to transaction service

  @Column({ name: 'RequirementId', type: 'varchar', nullable: true }) // FileCategory
  requirementId?: string | null; // child requirement, fk to requirement

  @Column({ name: 'Type', type: 'varchar', length: 255, nullable: false }) // FileType
  type!: string;

  @Column({ name: 'Notes', type: 'text', nullable: true })
  notes?: string | null;

  // Mark select: false to avoid selecting from databases that have not yet added the column.
  // Once the column exists in the DB, remove select:false if full projection is needed.
  @Column({ name: 'Version', type: 'int', nullable: true, default: 1, select: false })
  version?: number;

  @Column({ name: 'OCRProcessed', type: 'bit', nullable: false })
  ocrProcessed!: boolean;

  @Column({ name: 'OCRText', type: 'varchar', length: 255, nullable: false })
  ocrText!: string;

  @Column({ name: 'OCRConfidence', type: 'decimal', precision: 5, scale: 2, nullable: false })
  ocrConfidence!: number;

  @Column({ name: 'OCRProcessFailedReason', type: 'varchar', length: 255, nullable: true })
  ocrProcessFailedReason!: string | null;

  @Column({ name: 'OCRProcessedDate', type: 'datetime', nullable: false })
  ocrProcessedDate!: Date;

  // these fields are not extracted-fields entity as child-records
  // @Column({ name: 'OCRExtractedField', type: 'varchar', length: 255, nullable: true })
  // ocrExtractedField: string | null;

  // @Column({ name: 'OCRExtractedValue', type: 'text', nullable: true })
  // ocrExtractedValue: string | null;

  // //@Column({ name: 'OCRExtractedDate', type: 'datetime', nullable: true })
  // ocrExtractedDate: Date | null;

  // DOCUMENT RELATIONSHIPS
  @ManyToOne(() => TransactionEntity, (transaction) => transaction.documents, {
    eager: false,
  })
  @JoinColumn({ name: 'TransactionId', referencedColumnName: 'id' })
  transaction!: TransactionEntity;

  @ManyToOne(() => TransactionServiceEntity, (transactionService) => transactionService.documents, {
    eager: false,
  })
  @JoinColumn({ name: 'TransactionServiceId', referencedColumnName: 'id' })
  transactionService?: TransactionServiceEntity;

  @ManyToOne(() => UserEntity, (user) => user.documents, {
    eager: false,
  })
  @JoinColumn({ name: 'UserId', referencedColumnName: 'id' })
  user?: UserEntity;

  // Document Tags relationship
  @OneToMany(() => DocumentTagEntity, (documentTag) => documentTag.document, {
    eager: false,
    cascade: ['insert', 'update'],
  })
  documentTags?: DocumentTagEntity[];

  @OneToMany(() => ExtractedFieldsEntity, (extractedFields) => extractedFields.document, {
    eager: false,
    cascade: ['insert', 'update', 'remove'],
  })
  extractedFields!: ExtractedFieldsEntity[];

  @ManyToOne(() => RequirementEntity, (requirement) => requirement.documents, {
    eager: false,
  })
  @JoinColumn({ name: 'RequirementId', referencedColumnName: 'id' })
  requirement?: RequirementEntity;

  @OneToMany(() => RecipientDocumentsEntity, (rd) => rd.document, {
    eager: false,
    cascade: true,
  })
  recipientDocuments?: RecipientDocumentsEntity[];

  @ManyToOne(() => UserEntity, (user) => user.createdDocuments, {
    eager: false,
  })
  @JoinColumn({ name: 'CreatedBy', referencedColumnName: 'id' })
  createdByUser?: UserEntity;

  // Virtual property to get tags array (populated via documentTags)
  tags?: DocumentTagEntity[];
  isAllExtractedFieldsFilled?: boolean;
  convertedCreatedDate?: string;
  thumbnailUrl?: string | null;
  uploader?: UserEntity;
  publicUrl?: string;

  //
  @AfterLoad()
  onLoad() {
    this.checkAllExtractedFieldsFilled();
    this.setConvertedCreatedDate();
  }

  setConvertedCreatedDate() {
    this.convertedCreatedDate = formatToUserDate(this.createdDate);
  }

  checkAllExtractedFieldsFilled() {
    if (this.extractedFields && this.extractedFields.length > 0) {
      this.isAllExtractedFieldsFilled =
        this.extractedFields.length > 0 &&
        this.extractedFields.every((field) => !!field.value?.trim());
    } else {
      this.isAllExtractedFieldsFilled = true;
    }
  }
}
