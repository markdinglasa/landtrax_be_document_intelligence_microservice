import { ENTITY } from 'src/models/general-model';
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './general-entity';
import RoleAccessibleLinkEntity from './role-accessible-link-entity';

@Entity(ENTITY.ACCESSIBLE_LINK)
export default class AccessibleLinkEntity extends BaseEntity {
  @Column({ name: 'Action', type: 'varchar', nullable: false })
  action!: string;

  @Column({ name: 'Category', type: 'varchar', nullable: false })
  category!: string;

  @OneToMany(
    () => RoleAccessibleLinkEntity,
    (roleAccessibleLink) => roleAccessibleLink.accessibleLink,
    {
      eager: false,
    },
  )
  roleAccessibleLinks?: RoleAccessibleLinkEntity[];
}
