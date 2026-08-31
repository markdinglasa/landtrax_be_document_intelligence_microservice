import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
import { EmailService } from '../../../email/types';
import S3StorageService from '../../../storage/s3-storage-service';
import { AuditExportRateLimitService } from '../audit-export-rate-limit.service';
import { AuditReportsService } from '../audit-reports-service';
import { CollectionsReportsService } from '../collections-reports-service';
import { CourierReportsService } from '../courier-reports-service';
import { DocumentReportsService } from '../document-reports-service';
import { EntityCodeReportsService } from '../entity-code-reports-service';
import ReportsService from '../reports-service';
import { ServiceCatalogReportsService } from '../service-catalog-reports-service';
import { CompanyScopeHelper } from '../shared/company-scope-helper';
import { TransactionReportsService } from '../transaction-reports-service';
import { UserReportsService } from '../user-reports-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

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
        { provide: AuditExportRateLimitService, useValue: { isLimitReached: jest.fn().mockResolvedValue(false), getRemainingSlots: jest.fn().mockResolvedValue(3) } },
        { provide: getRepositoryToken(AuditExportJobEntity), useValue: { save: jest.fn(), findOne: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should ensure summary total matches list total and excludes EOS', async () => {
    const filters = {};

    // We want to verify that summary count reflects non-EOS services (21)
    // currently the summary is based on TransactionRepo and might return 13, 23, or 21 depending on deduplication.

    // Mock list view call
    const listQB = createMockQueryBuilder();
    listQB.getCount.mockResolvedValue(21);

    // Mock summary view call
    const summaryQB = createMockQueryBuilder();
    const mockServices = new Array(21).fill(null).map((_, i) => ({
      id: `s${i}`,
      isEOS: false,
      createdDate: new Date(),
      transactionId: `t${i}`,
      transaction: {
        id: `t${i}`,
        createdDate: new Date(),
        staging: { code: 'IN_PROCESS', name: 'In Process' },
        type: 'B2C',
      },
      staging: { code: 'IN_PROCESS', name: 'In Process' },
    }));
    summaryQB.getMany.mockResolvedValue(mockServices);

    transactionServiceRepo.createQueryBuilder
      .mockReturnValueOnce(listQB)
      .mockReturnValueOnce(summaryQB);

    const listResult = await service.getTransactionReports(filters as any);
    const summaryResult = await service.getTransactionReportsSummary(filters as any);

    // Assert that the total counts match
    expect(summaryResult.totalCount).toBe(listResult.meta.total);

    // Verify that both use the same repository repo
    expect(transactionServiceRepo.createQueryBuilder).toHaveBeenCalledTimes(2); // once for list, once for summary
    expect(transactionRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
