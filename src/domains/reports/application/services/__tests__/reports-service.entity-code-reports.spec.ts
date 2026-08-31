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

describe('ReportsService - Entity Code Reports', () => { 
  
  let service: ReportsService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndMapOne: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
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

  it('getEntityCodeReports should be defined', () => {
    expect(service.getEntityCodeReports).toBeDefined();
  });

  describe('getEntityCodeReports', () => { 
  
    it('should return paginated entity codes', async () => {
      const mockEntityCodes = [
        {
          id: '1',
          code: 'EC-001',
          status: 'ACTIVE',
          createdDate: new Date(),
          company: { name: 'Test Company' },
          accountOwner: { firstName: 'John', lastName: 'Doe' },
          createdByUser: { firstName: 'Admin', lastName: 'User' },
          proposalReferences: [{ proposalReferenceNumber: 'PR-123' }],
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockEntityCodes, 1]);

      const result = await service.getEntityCodeReports({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].entityCode).toBe('EC-001');
      expect(result.data[0].company).toBe('Test Company');
    });

    it('should apply status filter', async () => {
      await service.getEntityCodeReports({ status: 'ACTIVE' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('entityCode.status = :status', {
        status: 'ACTIVE',
      });
    });

    it('should apply search filter for company or code', async () => {
      await service.getEntityCodeReports({ search: 'test' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(entityCode.code LIKE :term OR createdByUser.firstName LIKE :term OR createdByUser.lastName LIKE :term OR createdByUser.email = :term OR accountOwner.firstName LIKE :term OR accountOwner.lastName LIKE :term OR accountOwner.email = :term OR company.name LIKE :term OR proposalReferences.referenceNumber LIKE :term)',
        { term: '%test%' },
      );
    });

    it('should apply date range filter', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-01-31';
      await service.getEntityCodeReports({ dateFrom, dateTo });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entityCode.createdDate >= :dateFrom',
        { dateFrom },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entityCode.createdDate <= :dateTo',
        expect.any(Object),
      );
    });

    it('should apply account owner filter', async () => {
      await service.getEntityCodeReports({ accountOwnerId: 'user-id' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'entityCode.accountOwnerId = :accountOwnerId',
        {
          accountOwnerId: 'user-id',
        },
      );
    });
  });
});
