import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EmailService } from '../../contracts/email.service.abstract';
import { AuditTrailService } from '../../contracts/audit-trail.service.abstract';
import { EmailHttpClient } from './email-http.client';
import { AuditTrailHttpClient } from './audit-trail-http.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  providers: [
    { provide: EmailService, useClass: EmailHttpClient },
    { provide: AuditTrailService, useClass: AuditTrailHttpClient },
  ],
  exports: [EmailService, AuditTrailService],
})
export class InternalHttpModule {}
