import { Expose } from 'class-transformer';

export class EntityCodeReportItemDto {
  @Expose()
  company!: string;

  @Expose()
  companyEmail!: string;

  @Expose()
  entityCode!: string;

  @Expose()
  accountOwner!: string;

  @Expose()
  accountOwnerEmail!: string;

  @Expose()
  proposalReferences!: string;

  @Expose()
  status!: string;

  @Expose()
  generatedBy!: string;

  @Expose()
  generatedDate!: string;
}
