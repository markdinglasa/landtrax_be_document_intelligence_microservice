import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import EmailTemplateEntity from './email-template-entity';
import { BaseEntity } from './general-entity';
import RoleEntity from './role-entity';
import UserEntity from './user-entity';

@Entity(ENTITY.EMAIL_TEMPLATE_RECIPIENT)
export default class EmailTemplateRecipientEntity extends BaseEntity {
  @Column({ name: 'EmailTemplateId', type: 'varchar', nullable: false })
  emailTemplateId!: string;

  @Column({ name: 'UserId', type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ name: 'RoleId', type: 'varchar', nullable: true })
  roleId!: string | null;

  @Column({ name: 'Type', type: 'varchar', nullable: false })
  type!: string;

  @ManyToOne(() => EmailTemplateEntity, (emailTemplate) => emailTemplate.emailTemplateRecipients, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'EmailTemplateId' })
  emailTemplate!: EmailTemplateEntity;

  @ManyToOne(() => UserEntity, (user) => user.emailTemplateRecipients, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId' })
  user!: UserEntity;

  @ManyToOne(() => RoleEntity, (role) => role.emailTemplateRecipients, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'RoleId' })
  role!: RoleEntity;
}
