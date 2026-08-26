import { Expose } from 'class-transformer';

export class DocumentReportItemDto {
  @Expose()
  documentId!: string;

  @Expose()
  filename!: string;

  @Expose()
  originalFilename!: string;

  @Expose()
  fileSize!: number;

  @Expose()
  mimeType!: string;

  @Expose()
  category!: 'pod' | 'contract' | 'identification' | 'supporting' | 'legal' | 'other';

  @Expose()
  documentType!: 'pdf' | 'jpg' | 'jpeg' | 'png' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'txt' | 'other';

  @Expose()
  requirementName?: string;
}
