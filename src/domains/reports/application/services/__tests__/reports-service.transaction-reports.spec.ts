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

describe('ReportsService - Transaction Reports', () => {
  let service: ReportsService;
  let mockTransactionServiceQueryBuilder: any;
  let transactionServiceRepo: any;
  let module: TestingModule;

  beforeEach(async () => {
    // Create a mock query builder chain
    mockTransactionServiceQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(100),
      getRawMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          transactionNumber: 'TRN-123',
          transactionServiceNumber: 'TRN-SRV-123',
          service: 'Title Search',
          clientName: 'Test Client',
          requestor: 'John Doe',
          proposalReference: 'PROP-123',
          parentStatus: 'IN_PROCESS',
          lastModified: new Date('2026-04-16T00:00:00.000Z'),
          createdDate: new Date('2026-04-15T00:00:00.000Z'),
        },
      ]),
      // To simulate query builder expression map for join attribute validation
      expressionMap: {
        mainAlias: { name: 'ts' },
        joinAttributes: [],
      },
    };

    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTransactionServiceQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'admin-id', type: 'Corporate' }),
    };

    transactionServiceRepo = mockRepository;

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
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(StagingEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(TransactionServiceEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(CollectionEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(CollectionMethodEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PayTypeEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ServiceEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(LandtraxAddressEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(UserCompanyEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AuditTrailEntity),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(EntityCodeEntity),
          useValue: mockRepository,
        },
        {
          provide: S3StorageService,
          useValue: {},
        },
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

  describe('getTransactionReports', () => {
    it('applies base conditions correctly', async () => {
      await service.getTransactionReports({});

      expect(transactionServiceRepo.createQueryBuilder).toHaveBeenCalledWith('ts');

      // Select fields and joins
      expect(mockTransactionServiceQueryBuilder.select).toHaveBeenCalled();
      expect(mockTransactionServiceQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'ts.transaction',
        't',
      );

      // Check Base conditions
      expect(mockTransactionServiceQueryBuilder.where).toHaveBeenCalledWith(
        'ts.deletedDate IS NULL',
      );
      expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ISNULL(ts.IsEOS,0) = 0 AND ts.transactionServiceNumber <> 'eos'",
      );
      expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
        't.deletedDate IS NULL',
      );
      expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
        "pst.code <> 'FOR_EOS_APPROVAL'",
      );
    });

    describe('Filtering', () => {
      it('applies date range filters with string matching YYYY-MM-DD', async () => {
        await service.getTransactionReports({
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
        });

        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ISNULL(t.updatedDate, t.createdDate) >= :dateFrom',
          { dateFrom: '2026-01-01' },
        );
        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ISNULL(t.updatedDate, t.createdDate) <= :dateTo',
          { dateTo: '2026-12-31 23:59:59' },
        );
      });

      it('applies date range filters with ISO string without creating invalid date', async () => {
        await service.getTransactionReports({
          dateFrom: '2026-04-15T09:20:48.186Z',
          dateTo: '2026-04-16T09:20:48.186Z',
        });

        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ISNULL(t.updatedDate, t.createdDate) >= :dateFrom',
          { dateFrom: '2026-04-15T09:20:48.186Z' },
        );
        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ISNULL(t.updatedDate, t.createdDate) <= :dateTo',
          { dateTo: '2026-04-16T09:20:48.186Z 23:59:59' },
        );
      });

      it('applies global search correctly across multiple fields and avoids duplicate joins', async () => {
        await service.getTransactionReports({ search: 'query123' });

        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          expect.stringContaining("CONCAT(u.firstName, ' ', u.lastName)"),
          { search: '%query123%' },
        );

        // Verify that ts was NOT leftJoined because it's the root alias
        expect(mockTransactionServiceQueryBuilder.leftJoin).not.toHaveBeenCalledWith(
          't.transactionServices',
          'ts',
        );
      });

      it('applies individual exact field matches', async () => {
        await service.getTransactionReports({
          transactionNumber: 'TRN-1',
          transactionServiceNumber: 'SRV-1',
          clientName: 'ClientA',
          requestor: 'John',
          proposalRef: 'PROP-1',
        });

        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          't.transactionNumber LIKE :transactionNumber',
          { transactionNumber: '%TRN-1%' },
        );
        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ts.transactionServiceNumber LIKE :transactionServiceNumber',
          { transactionServiceNumber: '%SRV-1%' },
        );
        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'ts.client LIKE :clientName',
          { clientName: '%ClientA%' },
        );
        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('requestor'),
          { requestor: '%John%' },
        );
        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          't.proposalReferenceNumber LIKE :proposalRef',
          { proposalRef: '%PROP-1%' },
        );
      });

      it('applies statues filtering properly by mapping API status to internal DB staging codes', async () => {
        await service.getTransactionReports({ statuses: 'pending, completed' });

        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          'pst.code IN (:...statuses)',
          { statuses: ['pending', 'completed'] },
        );
      });

      it('applies type filtering mapped to DB ENUMs', async () => {
        await service.getTransactionReports({ type: 'title_search' });

        expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
          't.type IN (:...types)',
          { types: ['B2B_SS_WO_PO'] },
        );
      });
    });
  });

  describe('getClientTransactionReports', () => {
    let spyGetCompanyUserIdsForCorporateAdmin: jest.SpyInstance;
    let companyScopeHelper: CompanyScopeHelper;

    beforeEach(() => {
      companyScopeHelper = module.get<CompanyScopeHelper>(CompanyScopeHelper);
      spyGetCompanyUserIdsForCorporateAdmin = jest
        .spyOn(companyScopeHelper, 'getCompanyUserIds')
        .mockResolvedValue(['user-1', 'user-2']);
    });

    afterEach(() => {
      spyGetCompanyUserIdsForCorporateAdmin.mockRestore();
    });

    it('early returns 0 results if the corporate client has no mapped users', async () => {
      spyGetCompanyUserIdsForCorporateAdmin.mockResolvedValueOnce([]);

      const result = await service.getClientTransactionReports({}, 'admin-id');

      expect(result.meta.total).toBe(0);
      expect(result.data).toEqual([]);
      expect(mockTransactionServiceQueryBuilder.getRawMany).not.toHaveBeenCalled();
    });

    it('scopes results based on the mapped company users', async () => {
      await service.getClientTransactionReports({}, 'admin-id');

      expect(spyGetCompanyUserIdsForCorporateAdmin).toHaveBeenCalledWith('admin-id');
      expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
        't.userId IN (:...userIds)',
        { userIds: ['user-1', 'user-2'] },
      );
    });

    it('applies all filters and generic base conditions just like getTransactionReports', async () => {
      await service.getClientTransactionReports({ search: 'query' }, 'admin-id');

      expect(mockTransactionServiceQueryBuilder.where).toHaveBeenCalledWith(
        'ts.deletedDate IS NULL',
      );
      // Verify global search applied safely
      expect(mockTransactionServiceQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('t.transactionNumber LIKE :search'),
        { search: '%query%' },
      );
    });
  });
});
