import { Column, Entity } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general-entity';

export enum EmailLogStatus {
  SENT = 'Sent',
  FAILED = 'Failed',
}

@Entity(ENTITY.EMAIL_LOG)
export default class EmailLogEntity extends LineEntity {
  @Column({ name: 'TemplateCode', type: 'varchar', nullable: false })
  templateCode!: string;

  @Column({ name: 'TemplateName', type: 'varchar', nullable: true })
  templateName?: string | null;

  @Column({ name: 'RenderedSubject', type: 'varchar', nullable: false })
  renderedSubject!: string;

  @Column({ name: 'RenderedBody', type: 'varchar', length: 'MAX', nullable: false })
  renderedBody!: string;

  @Column({ name: 'ToRecipients', type: 'simple-json', nullable: false })
  toRecipients!: string[];

  @Column({ name: 'CcRecipients', type: 'simple-json', nullable: true })
  ccRecipients?: string[] | null;

  @Column({ name: 'Status', type: 'varchar', nullable: false, default: EmailLogStatus.SENT })
  status!: EmailLogStatus;

  @Column({ name: 'ErrorMessage', type: 'varchar', length: 'MAX', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'SentAt', type: 'datetimeoffset', nullable: false })
  sentAt!: Date;

  @Column({ name: 'RetryCount', type: 'int', nullable: false, default: 0 })
  retryCount!: number;

  @Column({ name: 'LastRetryAt', type: 'datetimeoffset', nullable: true })
  lastRetryAt?: Date | null;

  @Column({ name: 'IsRetryable', type: 'bit', nullable: false, default: true })
  isRetryable!: boolean;
}
