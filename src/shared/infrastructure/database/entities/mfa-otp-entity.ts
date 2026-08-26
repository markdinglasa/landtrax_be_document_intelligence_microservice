import { Column, Entity, Index } from 'typeorm';
import { ENTITY } from '../models/general-model';
import { BaseEntity } from './general-entity';

@Entity(ENTITY.MFA_OTP)
@Index(['userIdentifier', 'expiresAt'])
export default class MfaOtpEntity extends BaseEntity {
  @Column({ name: 'UserIdentifier', type: 'varchar', length: 255, nullable: false })
  userIdentifier!: string; // Can be username or email

  @Column({ name: 'OtpCode', type: 'varchar', length: 6, nullable: false })
  otpCode!: string;

  @Column({ name: 'ExpiresAt', type: 'datetime', nullable: false })
  expiresAt!: Date;

  @Column({ name: 'UsedAt', type: 'datetime', nullable: true })
  usedAt!: Date | null;

  @Column({ name: 'AttemptCount', type: 'int', nullable: false, default: 0 })
  attemptCount!: number;

  @Column({ name: 'IpAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'UserAgent', type: 'text', nullable: true })
  userAgent!: string | null;
}
