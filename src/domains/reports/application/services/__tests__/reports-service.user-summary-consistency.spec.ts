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

describe('ReportsService - User Summary Consistency', () => { 
  
  let service: ReportsService;
  let userRepo: any;

  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndMapOne: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
    expressionMap: {
      joinAttributes: [],
    },
  });

  beforeEach(async () => {
    userRepo = {
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
        { provide: getRepositoryToken(TransactionEntity), useValue: userRepo },
        { provide: getRepositoryToken(StagingEntity), useValue: userRepo },
        { provide: getRepositoryToken(DocumentEntity), useValue: userRepo },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: userRepo },
        { provide: getRepositoryToken(CollectionEntity), useValue: userRepo },
        { provide: getRepositoryToken(CollectionMethodEntity), useValue: userRepo },
        { provide: getRepositoryToken(PayTypeEntity), useValue: userRepo },
        { provide: getRepositoryToken(ServiceEntity), useValue: userRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(LandtraxAddressEntity), useValue: {} },

        { provide: getRepositoryToken(UserCompanyEntity), useValue: userRepo },
        { provide: getRepositoryToken(AuditTrailEntity), useValue: userRepo },
        { provide: getRepositoryToken(EntityCodeEntity), useValue: userRepo },
        { provide: S3StorageService, useValue: { uploadFile: jest.fn(), getSignedUrl: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: AuditExportRateLimitService, useValue: { isLimitReached: jest.fn().mockResolvedValue(false), getRemainingSlots: jest.fn().mockResolvedValue(3) } },
        { provide: getRepositoryToken(AuditExportJobEntity), useValue: { save: jest.fn(), findOne: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should apply identical base filters to user reports and summary', async () => {
    // Call getUserReports
    await service.getUserReports({});
    const listQB = (userRepo.createQueryBuilder as jest.Mock).mock.results[0].value;
    const listWhereCall = listQB.where.mock.calls[0][0];

    // Call getUserReportsSummary
    await service.getUserReportsSummary({});
    const summaryQB = (userRepo.createQueryBuilder as jest.Mock).mock.results[1].value;
    const summaryWhereCall = summaryQB.where.mock.calls[0][0];

    // EXPECTED TO FAIL: list excludes SYSTEM, summary does not
    expect(summaryWhereCall).toBe(listWhereCall);
    expect(summaryWhereCall).toContain("user.username <> 'SYSTEM'");
  });
});
