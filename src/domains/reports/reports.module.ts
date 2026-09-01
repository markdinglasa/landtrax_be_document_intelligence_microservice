import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job.entity';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail.entity';
import CollectionMethodEntity from 'src/shared/infrastructure/database/entities/collection-method.entity';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code.entity';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address.entity';
import PayTypeEntity from 'src/shared/infrastructure/database/entities/pay-type.entity';
import RequirementEntity from 'src/shared/infrastructure/database/entities/requirement.entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import StagingEntity from 'src/shared/infrastructure/database/entities/staging.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import { InternalHttpModule } from 'src/shared/infrastructure/http/internal-http.module';
import S3StorageService from 'src/shared/infrastructure/storage/s3-storage-service';
import { AuditExportRateLimitService } from './application/services/audit-export-rate-limit.service';
import { AuditReportsService } from './application/services/audit-reports.service';
import { CollectionsReportsService } from './application/services/collections-reports.service';
import { CourierReportsService } from './application/services/courier-reports.service';
import { DocumentReportsService } from './application/services/document-reports.service';
import { EntityCodeReportsService } from './application/services/entity-code-reports.service';
import ReportsService from './application/services/reports.service';
import { ServiceCatalogReportsService } from './application/services/service-catalog-reports.service';
import { CompanyScopeHelper } from './application/services/shared/company-scope-helper';
import { TransactionReportsService } from './application/services/transaction-reports.service';
import { UserReportsService } from './application/services/user-reports.service';
import { CollectionsReportsController } from './presentation/controllers/collections-reports.controller';
import { CourierReportsController } from './presentation/controllers/courier-reports.controller';
import { DocumentReportsController } from './presentation/controllers/document-reports.controller';
import { EntityCodeReportsController } from './presentation/controllers/entity-code-reports.controller';
import { ServiceCatalogReportsController } from './presentation/controllers/service-catalog-reports.controller';
import { TransactionReportsController } from './presentation/controllers/transaction-reports.controller';
import { UserReportsController } from './presentation/controllers/user-reports.controller';

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
  S3StorageService,
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
      EntityCodeEntity,
      LandtraxAddressEntity,
    ]),
    ThrottlerModule,
    InternalHttpModule,
  ],
  controllers: [
    CollectionsReportsController,
    CourierReportsController,
    DocumentReportsController,
    TransactionReportsController,
    UserReportsController,
    EntityCodeReportsController,
    ServiceCatalogReportsController,
  ],
  providers: [ReportsService, ...domainServices],
  exports: [ReportsService, ...domainServices],
})
export class ReportsModule {}
