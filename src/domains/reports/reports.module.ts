import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job-entity';
import FeedbackEntity from 'src/shared/infrastructure/database/entities/feedback-entity';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail-entity';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection-entity';
import CollectionMethodEntity from 'src/shared/infrastructure/database/entities/collection-method-entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document-entity';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code-entity';
import PayTypeEntity from 'src/shared/infrastructure/database/entities/pay-type-entity';
import RequirementEntity from 'src/shared/infrastructure/database/entities/requirement-entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-entity';
import StagingEntity from 'src/shared/infrastructure/database/entities/staging-entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction-entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service-entity';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company-entity';
import { EmailModule } from '../email/email-module';
import S3StorageService from '../storage/s3-storage-service';
import StorageModule from '../storage/storage-module';
import { AuditReportsController } from './presentation/controllers/audit-reports-controller';
import { CollectionsReportsController } from './presentation/controllers/collections-reports-controller';
import { CourierReportsController } from './presentation/controllers/courier-reports-controller';
import { DocumentReportsController } from './presentation/controllers/document-reports-controller';
import { EntityCodeReportsController } from './presentation/controllers/entity-code-reports-controller';
import { ServiceCatalogReportsController } from './presentation/controllers/service-catalog-reports-controller';
import { TransactionReportsController } from './presentation/controllers/transaction-reports-controller';
import { UserReportsController } from './presentation/controllers/user-reports-controller';
import { AuditExportRateLimitService } from './application/services/audit-export-rate-limit.service';
import { AuditReportsService } from './application/services/audit-reports-service';
import { CollectionsReportsService } from './application/services/collections-reports-service';
import { CourierReportsService } from './application/services/courier-reports-service';
import { DocumentReportsService } from './application/services/document-reports-service';
import { EntityCodeReportsService } from './application/services/entity-code-reports-service';
import ReportsService from './application/services/reports-service';
import { ServiceCatalogReportsService } from './application/services/service-catalog-reports-service';
import { CompanyScopeHelper } from './application/services/shared/company-scope-helper';
import { TransactionReportsService } from './application/services/transaction-reports-service';
import { UserReportsService } from './application/services/user-reports-service';

const domainServices = [
  AuditReportsService,
  AuditExportRateLimitService,
  CollectionsReportsService,
  CourierReportsService,
  DocumentReportsService,
  EntityCodeReportsService,
  TransactionReportsService,
  UserReportsService,
  ServiceCatalogReportsService,
  CompanyScopeHelper,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      StagingEntity,
      DocumentEntity,
      RequirementEntity,
      TransactionServiceEntity,
      CollectionEntity,
      CollectionMethodEntity,
      UserCompanyEntity,
      UserEntity,
      AuditTrailEntity,
      AuditExportJobEntity,
      PayTypeEntity,
      ServiceEntity,
      FeedbackEntity,
      EntityCodeEntity,
      LandtraxAddressEntity,
    ]),
    StorageModule,
    ThrottlerModule,
    EmailModule,
  ],
  controllers: [
    AuditReportsController,
    CollectionsReportsController,
    CourierReportsController,
    DocumentReportsController,
    TransactionReportsController,
    UserReportsController,
    EntityCodeReportsController,
    ServiceCatalogReportsController,
  ],
  providers: [ReportsService, S3StorageService, ...domainServices],
  exports: [ReportsService, S3StorageService, ...domainServices],
})
export class ReportsModule {}
