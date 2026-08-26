import { Status } from './status';
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export abstract class Base {
  /**
   * id
   */
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  /**
   * created_by
   */
  @Column({
    nullable: false,
    default: '',
  })
  created_by: string;

  /**
   * updated_by
   */
  @Column({
    nullable: false,
    default: '',
  })
  updated_by: string;

  /**
   * created_date
   */
  @CreateDateColumn()
  created_date: Date;

  /**
   * updated_date
   */
  @UpdateDateColumn()
  updated_date: Date;

  /**
   * status
   */
  @Column({
    default: Status.ENABLED,
  })
  status: string;
}
