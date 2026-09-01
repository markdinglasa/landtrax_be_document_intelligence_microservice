import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailService } from 'src/shared/contracts/email.service.abstract';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job.entity';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail.entity';
import CollectionMethodEntity from 'src/shared/infrastructure/database/entities/collection-method.entity';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code.entity';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address.entity';
import PayTypeEntity from 'src/shared/infrastructure/database/entities/pay-type.entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import StagingEntity from 'src/shared/infrastructure/database/entities/staging.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import S3StorageService from 'src/shared/infrastructure/storage/s3-storage-service';
import { AuditExportRateLimitService } from '../audit-export-rate-limit.service';
import { AuditReportsService } from '../audit-reports.service';
import { CollectionsReportsService } from '../collections-reports.service';
import { CourierReportsService } from '../courier-reports.service';
import { DocumentReportsService } from '../document-reports.service';
import { EntityCodeReportsService } from '../entity-code-reports.service';
import ReportsService from '../reports.service';
import { ServiceCatalogReportsService } from '../service-catalog-reports.service';
import { CompanyScopeHelper } from '../shared/company-scope-helper';
import { TransactionReportsService } from '../transaction-reports.service';
import { UserReportsService } from '../user-reports.service';

describe('ReportsService - Transaction Summary Consistency', () => {
  let service: ReportsService;
  let transactionRepo: any;
  let transactionServiceRepo: any;

  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndMapOne: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
    clone: jest.fn().mockReturnThis(),
    expressionMap: {
      joinAttributes: [],
    },
  });

  beforeEach(async () => {
    transactionRepo = {
      createQueryBuilder: jest.fn().mockImplementation(createMockQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    transactionServiceRepo = {
      createQueryBuilder: jest.fn().mockImplementation(createMockQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,

        AuditReportsService,
        CollectionsReportsService,
        CourierReportsService,
        DocumentReportsService,
        EntityCodeReportsService,
        { provide: ServiceCatalogReportsService, useValue: {} },
        TransactionReportsService,
        UserReportsService,
        CompanyScopeHelper,
        { provide: getRepositoryToken(TransactionEntity), useValue: transactionRepo },
        { provide: getRepositoryToken(StagingEntity), useValue: {} },
        { provide: getRepositoryToken(DocumentEntity), useValue: {} },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: transactionServiceRepo },
        { provide: getRepositoryToken(CollectionEntity), useValue: {} },
        { provide: getRepositoryToken(CollectionMethodEntity), useValue: {} },
        { provide: getRepositoryToken(PayTypeEntity), useValue: {} },
        { provide: getRepositoryToken(ServiceEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
        { provide: getRepositoryToken(LandtraxAddressEntity), useValue: {} },

        { provide: getRepositoryToken(UserCompanyEntity), useValue: transactionRepo },
        { provide: getRepositoryToken(AuditTrailEntity), useValue: transactionRepo },
        { provide: getRepositoryToken(EntityCodeEntity), useValue: transactionRepo },
        { provide: S3StorageService, useValue: { uploadFile: jest.fn(), getSignedUrl: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        {
          provide: AuditExportRateLimitService,
          useValue: {
            isLimitReached: jest.fn().mockResolvedValue(false),
            getRemainingSlots: jest.fn().mockResolvedValue(3),
          },
        },
        {
          provide: getRepositoryToken(AuditExportJobEntity),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });
});
