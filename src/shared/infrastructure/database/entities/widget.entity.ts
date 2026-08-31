import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ChartType, type WidgetSize, type WidgetType } from '../../../common/wdigets';
import { Entities } from '../models/general.model';
import { BaseEntity } from './general.entity';
import UserEntity from './user.entity';

@Entity(Entities.WIDGET)
export default class WidgetEntity extends BaseEntity {
  @Column({ name: 'UserId', type: 'varchar', nullable: false })
  userId!: string;

  @Column({ name: 'Title', type: 'varchar', nullable: false })
  title!: string;

  @Column({ name: 'ChartType', type: 'varchar', nullable: false })
  chartType!: ChartType;

  @Column({ name: 'Type', type: 'varchar', nullable: false })
  type!: WidgetType;

  @Column({ name: 'Size', type: 'varchar', nullable: false })
  size!: WidgetSize;

  @Column({ name: 'Position', type: 'int', nullable: false })
  position!: number;

  @Column({ name: 'Row', type: 'int', nullable: false })
  row!: number;

  @Column({ name: 'Col', type: 'int', nullable: false })
  col!: number;

  @Column({ name: 'Width', type: 'int', nullable: false })
  width!: number;

  @Column({ name: 'Height', type: 'int', nullable: false })
  height!: number;

  @Column({ name: 'IsVisible', type: 'bit', nullable: false })
  isVisible!: boolean;

  @Column({ name: 'IsResizable', type: 'bit', nullable: false })
  isResizable!: boolean;

  @Column({ name: 'IsDraggable', type: 'bit', nullable: false })
  isDraggable!: boolean;

  @Column({ name: 'IsShowLegeng', type: 'bit', nullable: false })
  isShowLegeng!: boolean;

  @Column({ name: 'IsShowGrid', type: 'bit', nullable: false })
  isShowGrid!: boolean;

  @Column({ name: 'IsAnimate', type: 'bit', nullable: false })
  isAnimate!: boolean;

  @Column({ name: 'RefreshInterval', type: 'int', nullable: false })
  refreshInterval!: number;

  @Column({ name: 'DataSource', type: 'varchar', nullable: true })
  dataSource!: string | null;

  @Column({ name: 'Configuration', type: 'varchar', nullable: true })
  configuration!: string | null;

  @Column({ name: 'Filter', type: 'varchar', nullable: true })
  filter!: string | null;

  @Column({ name: 'CustomQuery', type: 'varchar', nullable: true })
  customQuery!: string | null;

  @Column({ name: 'ColorScheme', type: 'varchar', nullable: true })
  colorScheme!: string | null;

  @ManyToOne(() => UserEntity, (user) => user.widgets, {
    eager: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'UserId' })
  user?: UserEntity;
}
