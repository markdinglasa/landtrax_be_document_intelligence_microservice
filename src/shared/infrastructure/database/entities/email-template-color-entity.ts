import { Column, Entity, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import EmailTemplateEntity from './email-template-entity';
import { BaseEntity } from './general-entity';

@Entity(ENTITY.EMAIL_TEMPLATE_COLOR)
export default class EmailTemplateColorEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', nullable: true })
  name!: string;

  @Column({ name: 'Primary', type: 'varchar', nullable: false })
  primary!: string;

  @Column({ name: 'Secondary', type: 'varchar', nullable: false })
  secondary!: string;

  @Column({ name: 'Foreground', type: 'varchar', nullable: false })
  foreground!: string;

  @Column({ name: 'Background', type: 'varchar', nullable: false })
  background!: string;

  @OneToMany(() => EmailTemplateEntity, (emailTemplate) => emailTemplate.emailTemplateColor, {
    eager: false,
  })
  emailTemplates!: EmailTemplateEntity[];
}
