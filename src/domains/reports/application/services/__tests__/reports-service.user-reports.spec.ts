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

describe('ReportsService - User Reports', () => { 
  
  let service: ReportsService;
  let module: TestingModule;

  const mockQueryBuilder = {
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
    getRawOne: jest.fn().mockResolvedValue(null),
    expressionMap: {
      joinAttributes: [],
    },
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
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
        { provide: getRepositoryToken(TransactionEntity), useValue: mockRepository },
        { provide: getRepositoryToken(StagingEntity), useValue: mockRepository },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockRepository },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: mockRepository },
        { provide: getRepositoryToken(CollectionEntity), useValue: mockRepository },
        { provide: getRepositoryToken(CollectionMethodEntity), useValue: mockRepository },
        { provide: getRepositoryToken(PayTypeEntity), useValue: mockRepository },
        { provide: getRepositoryToken(ServiceEntity), useValue: mockRepository },
        { provide: getRepositoryToken(UserEntity), useValue: mockRepository },
        { provide: getRepositoryToken(LandtraxAddressEntity), useValue: {} },

        { provide: getRepositoryToken(UserCompanyEntity), useValue: mockRepository },
        { provide: getRepositoryToken(AuditTrailEntity), useValue: mockRepository },
        { provide: getRepositoryToken(EntityCodeEntity), useValue: mockRepository },
        { provide: S3StorageService, useValue: {} },
        { provide: EmailService, useValue: { sendEmail: jest.fn() } },
        { provide: AuditExportRateLimitService, useValue: { isLimitReached: jest.fn().mockResolvedValue(false), getRemainingSlots: jest.fn().mockResolvedValue(3) } },
        { provide: getRepositoryToken(AuditExportJobEntity), useValue: { save: jest.fn(), findOne: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) } },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('getUserReportsSummary should be defined', () => {
    expect((service as any).getUserReportsSummary).toBeDefined();
  });

  describe('getUserReportsSummary', () => { 
  
    it('should return correct summary data', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(10); // total
      mockQueryBuilder.clone.mockReturnThis();
      mockQueryBuilder.getCount.mockResolvedValueOnce(6); // active
      mockQueryBuilder.getCount.mockResolvedValueOnce(4); // inactive
      mockQueryBuilder.getCount.mockResolvedValueOnce(8); // verified
      mockQueryBuilder.getCount.mockResolvedValueOnce(5); // 2fa

      const result = await (service as any).getUserReportsSummary({});

      expect(result).toEqual({
        totalUsers: 10,
        activeUsers: 6,
        inactiveUsers: 4,
        emailVerifiedCount: 8,
        twoFactorAdoptionRate: 50,
      });
    });

    it('should handle pluralized status filters', async () => {
      await (service as any).getUserReportsSummary({ statuses: 'active,inactive' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.status IN (:...statuses)', {
        statuses: ['Active', 'INACTIVE'],
      });
    });

    it('should handle pluralized registration status filters', async () => {
      await (service as any).getUserReportsSummary({ registrationStatuses: 'approved,pending' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.isApproved = 1 OR user.isApproved IS NULL)',
      );
    });

    it('should apply client scoping when userId is provided', async () => {
      const companyScopeHelper = module.get<CompanyScopeHelper>(CompanyScopeHelper);
      const spy = jest
        .spyOn(companyScopeHelper, 'getCompanyUserIds')
        .mockResolvedValue(['user-1', 'user-2']);

      await (service as any).getUserReportsSummary({}, 'corporate-admin-id');

      expect(spy).toHaveBeenCalledWith('corporate-admin-id');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.id IN (:...userIds)', {
        userIds: ['user-1', 'user-2'],
      });
    });
  });
});
