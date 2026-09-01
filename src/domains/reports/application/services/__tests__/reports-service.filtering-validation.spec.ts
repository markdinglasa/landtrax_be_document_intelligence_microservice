import { BadRequestException } from '@nestjs/common';
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

describe('ReportsService - Filtering and Validation (Bug Condition Exploration)', () => {
  let service: ReportsService;
  let userRepo: any;
  let auditRepo: any;

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
    userRepo = {
      createQueryBuilder: jest.fn().mockImplementation(createMockQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id', username: 'SYSTEM' }),
      find: jest.fn().mockResolvedValue([]),
    };

    auditRepo = {
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
        { provide: getRepositoryToken(AuditTrailEntity), useValue: auditRepo },
        { provide: getRepositoryToken(EntityCodeEntity), useValue: userRepo },
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

  /**
   * Property 1: Bug Condition - User Reports Company Filter
   *
   * This test verifies that the company/department filter is applied to the query.
   * EXPECTED TO FAIL: The current implementation ignores the department/company filter in applyUserReportsFilters.
   */
  describe('Property 1: User Reports Company Filter', () => {
    it('should apply company filter to User Reports query', async () => {
      const companyName = 'Test Company';

      // We are testing that the filter is even ATTEMPTED to be applied
      await service.getUserReports({ company: companyName } as any);

      const qb = (userRepo.createQueryBuilder as jest.Mock).mock.results[0].value;
      const companyFilterCall = qb.andWhere.mock.calls.find((call: any[]) =>
        call[0].includes('company.name'),
      );

      expect(companyFilterCall).toBeDefined();
    });
  });

  /**
   * Property 2: Bug Condition - Audit Report Summary Consistency
   *
   * This test verifies that both getAuditReports and getAuditReportsSummary use exactly the same filters.
   * EXPECTED TO FAIL: We want to ensure that any filter applied to one is applied to the other.
   * We will check if the number of andWhere calls matches for a given set of filters.
   */

  /**
   * Property 3: Bug Condition - Invalid Date range validation
   *
   * EXPECTED TO FAIL: Currently the methods likely just pass the dates to TypeORM without checking if dateFrom > dateTo.
   */
  describe('Property 3: Date Range Validation', () => {
    it('should throw BadRequestException for invalid user report date range', async () => {
      const filters = {
        dateFrom: '2026-12-31',
        dateTo: '2026-01-01', // Invalid range
      };

      await expect(service.getUserReports(filters as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid audit report date range', async () => {
      const filters = {
        dateFrom: '2026-12-31',
        dateTo: '2026-01-01', // Invalid range
      };

      await expect(service.getAuditReports(filters as any)).rejects.toThrow(BadRequestException);
    });
  });
});
