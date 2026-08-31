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
import { EmailService } from 'src/shared/contracts/email.service.abstract';
import S3StorageService from 'src/shared/infrastructure/storage/s3-storage-service';
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

describe('ReportsService - Filtering Preservation (Expected to PASS on unfixed code)', () => { 
  
  let service: ReportsService;
  let mockUserQueryBuilder: any;
  let userRepo: any;

  beforeEach(async () => {
    mockUserQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndMapOne: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(100),
      getMany: jest.fn().mockResolvedValue([]),
      clone: jest.fn().mockReturnThis(),
      expressionMap: {
        joinAttributes: [],
      },
    };

    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockUserQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id', username: 'SYSTEM' }),
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
        { provide: getRepositoryToken(StagingEntity), useValue: {} },
        { provide: getRepositoryToken(DocumentEntity), useValue: {} },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: {} },
        { provide: getRepositoryToken(CollectionEntity), useValue: {} },
        { provide: getRepositoryToken(CollectionMethodEntity), useValue: {} },
        { provide: getRepositoryToken(PayTypeEntity), useValue: {} },
        { provide: getRepositoryToken(ServiceEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(LandtraxAddressEntity), useValue: {} },

        { provide: getRepositoryToken(UserCompanyEntity), useValue: {} },
        {
          provide: getRepositoryToken(AuditTrailEntity),
          useValue: userRepo,
        },
        { provide: getRepositoryToken(EntityCodeEntity), useValue: userRepo },
        { provide: S3StorageService, useValue: { uploadFile: jest.fn(), getSignedUrl: jest.fn() } },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: AuditExportRateLimitService, useValue: { isLimitReached: jest.fn().mockResolvedValue(false), getRemainingSlots: jest.fn().mockResolvedValue(3) } },
        { provide: getRepositoryToken(AuditExportJobEntity), useValue: { save: jest.fn(), findOne: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('User Reports - Existing Filter Preservation', () => { 
  
    it('should apply status filter correctly', async () => {
      await service.getUserReports({ status: 'ACTIVE' });
      expect(mockUserQueryBuilder.andWhere).toHaveBeenCalledWith('user.status IN (:...statuses)', {
        statuses: ['Active'],
      });
    });

    it('should apply search filter correctly', async () => {
      await service.getUserReports({ search: 'John' });
      expect(mockUserQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(user.firstName) LIKE :search'),
        expect.objectContaining({ search: '%john%' }),
      );
    });

    it('should apply registration status filter correctly', async () => {
      await service.getUserReports({ registrationStatus: 'approved' });
      expect(mockUserQueryBuilder.andWhere).toHaveBeenCalledWith('(user.isApproved = 1)');
    });

    it('should apply pagination correctly', async () => {
      await service.getUserReports({ page: 2, limit: 10 });
      expect(mockUserQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockUserQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply sorting correctly', async () => {
      await service.getUserReports({ sortBy: 'name', sortDirection: 'asc' });
      expect(mockUserQueryBuilder.orderBy).toHaveBeenCalledWith('user.firstName', 'ASC');
    });
  });
});
