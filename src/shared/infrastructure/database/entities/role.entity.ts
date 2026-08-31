import { Column, Entity, OneToMany } from 'typeorm';
import { ENTITY } from '../models/general-model';
import EmailTemplateRecipientEntity from './email-template-recipient-entity';
import { BaseEntity } from './general-entity';
import RoleAccessibleLinkEntity from './role-accessible-link.entity';
import UserRoleEntity from './user-role.entity';

@Entity(ENTITY.ROLE)
export default class RoleEntity extends BaseEntity {
  @Column({ name: 'Name', type: 'varchar', nullable: false })
  name!: string;

  @Column({ name: 'Description', type: 'text', nullable: true })
  description!: string | null;

  // ROLE RELATIONSHIPS
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.role, {
    eager: false,
  })
  userRoles!: UserRoleEntity[];

  // role-accessible-link entity links the role and accessible-link (junction table)
  @OneToMany(() => RoleAccessibleLinkEntity, (roleAccessibleLink) => roleAccessibleLink.role, {
    eager: false,
  })
  roleAccessibleLinks!: RoleAccessibleLinkEntity[];

  @OneToMany(
    () => EmailTemplateRecipientEntity,
    (emailTemplateRecipient) => emailTemplateRecipient.role,
    {
      eager: false,
    },
  )
  emailTemplateRecipients!: EmailTemplateRecipientEntity[];
}
