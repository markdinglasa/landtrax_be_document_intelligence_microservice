import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { LineEntity } from './general.entity';
import Role from './role.entity';
import User from './user.entity';

@Entity(ENTITY.USER_ROLE)
//@Unique('UQ_UserRole_UserId_RoleId', ['userId', 'roleId'])
export default class UserRoleEntity extends LineEntity {
  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'RoleId', type: 'varchar', nullable: false })
  roleId!: string;

  // USER ROLE RELATIONSHIPS
  // a user may have multiple roles
  @ManyToOne(() => User, (user) => user.userRoles, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId' }) // this ensures the FK column is used
  user!: User;

  //
  @ManyToOne(() => Role, (role) => role.userRoles, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'RoleId' }) // this ensures the FK column is used
  role!: Role; // each user-role
}
