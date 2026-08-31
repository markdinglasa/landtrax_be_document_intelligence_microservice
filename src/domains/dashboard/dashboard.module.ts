import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTrailModule } from 'src/modules/audit-trail/audit-trail-module';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import StagingEntity from 'src/shared/infrastructure/database/entities/staging.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import WidgetEntity from 'src/shared/infrastructure/database/entities/widget.entity';
import { DashboardAdminService } from './application/services/dashboard-admin-service';
import { DashboardClientService } from './application/services/dashboard-client-service';
import { DashboardHelperService } from './application/services/dashboard-helper-service';
import { DashboardServiceImpl } from './application/services/dashboard-service';
import { DashboardSummaryService } from './application/services/dashboard-summary-service';
import { DashboardWidgetService } from './application/services/dashboard-widget-service';
import { AdminDashboardController } from './presentation/controllers/admin-dashboard-controller';
import { ClientDashboardController } from './presentation/controllers/client-dashboard-controller';
import { DashboardService } from './types';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      TransactionServiceEntity,
      DocumentEntity,
      CollectionEntity,
      StagingEntity,
      ServiceEntity,
      WidgetEntity,
      UserCompanyEntity,
      UserEntity,
    ]),
    ThrottlerModule,
    AuditTrailModule,
  ],
  controllers: [ClientDashboardController, AdminDashboardController],
  providers: [
    DashboardHelperService,
    DashboardWidgetService,
    DashboardSummaryService,
    DashboardClientService,
    DashboardAdminService,
    {
      provide: DashboardService,
      useClass: DashboardServiceImpl,
    },
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
