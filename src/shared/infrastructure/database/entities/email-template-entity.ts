import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import EmailTemplateColorEntity from './email-template-color-entity';
import EmailTemplateRecipientEntity from './email-template-recipient-entity';
import { BaseEntity } from './general-entity';

@Entity(ENTITY.EMAIL_TEMPLATE)
export default class EmailTemplateEntity extends BaseEntity {
  @Column({ name: 'Code', type: 'varchar', nullable: true, unique: true })
  code!: string | null;

  @Column({ name: 'EmailTemplateColorId', type: 'varchar', nullable: true })
  emailTemplateColorId!: string | null;

  @Column({ name: 'Name', type: 'varchar', nullable: false })
  name!: string;

  @Column({ name: 'Subject', type: 'varchar', nullable: false })
  subject!: string;

  @Column({ name: 'Content', type: 'varchar', length: 'MAX', nullable: false })
  content!: string;

  @Column({ name: 'To', type: 'simple-json', nullable: true })
  to!: string[] | null;

  @Column({ name: 'Cc', type: 'simple-json', nullable: true })
  cc?: string[] | null;

  @Column({ name: 'Parameters', type: 'simple-json', nullable: true })
  parameters?: string[] | null;

  @ManyToOne(
    () => EmailTemplateColorEntity,
    (emailTemplateColor) => emailTemplateColor.emailTemplates,
    {
      eager: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'EmailTemplateColorId' })
  emailTemplateColor?: EmailTemplateColorEntity;

  @OneToMany(
    () => EmailTemplateRecipientEntity,
    (emailTemplateRecipient) => emailTemplateRecipient.emailTemplate,
    {
      eager: false,
    },
  )
  emailTemplateRecipients?: EmailTemplateRecipientEntity[];
}
