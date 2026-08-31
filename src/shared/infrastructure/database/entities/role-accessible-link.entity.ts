import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general.entity';
import RoleEntity from './role.entity';

@Entity(ENTITY.ROLE_ACCESSIBLE_LINK)
//@Unique('UQ_RoleAccessibleLink_RoleId_LinkId', ['roleId', 'accessibleLinkId'])
export default class RoleAccessibleLinkEntity extends LineEntity {
  @Column({ name: 'RoleId', type: 'varchar', nullable: false })
  roleId!: string;

  @Column({ name: 'AccessibleLinkId', type: 'varchar', nullable: false })
  accessibleLinkId!: string;

  // a role may have multiple accessible-links through this junction table
  @ManyToOne(() => RoleEntity, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'RoleId' }) // this ensures the FK column is used
  role?: RoleEntity;
}
