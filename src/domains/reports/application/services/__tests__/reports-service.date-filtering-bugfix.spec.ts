import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fc from 'fast-check';
import { EmailService } from 'src/shared/contracts/email.service.abstract';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job.entity';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail.entity';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document.entity';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code.entity';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address.entity';
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

const isTargetCallTransaction = (call: any[]) =>
  call[0] === 'ISNULL(t.updatedDate, t.createdDate) <= :dateTo';
const isTargetCallDocument = (call: any[]) =>
  call[0] === 'ISNULL(document.updatedDate, document.createdDate) <= :dateTo';

/**
 * Helper function to check if input matches bug condition
 * Bug condition: dateTo contains 'T', 'Z', and length > 10
 */
function isBugCondition(dateTo: string): boolean {
  return dateTo !== null && dateTo.includes('T') && dateTo.includes('Z') && dateTo.length > 10;
}

/**
 * Bug Condition Exploration Test for ISO Date String Parsing Bug
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * This test explores the bug condition where dateTo filters containing full ISO date strings
 * with time components cause database query errors. The test is EXPECTED TO FAIL on unfixed code,
 * which confirms the bug exists.
 *
 * Bug Condition: dateTo contains 'T', 'Z', and length > 10 (ISO date with time)
 * Expected Behavior: System should parse ISO date strings correctly without errors
 * Actual Behavior (unfixed): System appends 'T23:59:59.999Z' to ISO strings, creating invalid dates
 */
describe('ReportsService - Date Filtering Bugfix (Bug Condition Exploration)', () => {
  let service: ReportsService;
  let mockTransactionQueryBuilder: any;
  let mockCollectionQueryBuilder: any;
  let mockDocumentQueryBuilder: any;
  let transactionRepo: any;
  let collectionRepo: any;
  let documentRepo: any;

  beforeEach(async () => {
    // Create mock query builders for transaction reports
    mockTransactionQueryBuilder = {
      select: jest.fn().mockReturnThis(),
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
      addSelect: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      expressionMap: {
        mainAlias: { name: 'ts' },
        joinAttributes: [],
      },
    };

    // Create mock query builders for collection reports
    mockCollectionQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
      expressionMap: {
        joinAttributes: [],
      },
    };

    // Create mock query builders for document reports
    mockDocumentQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      expressionMap: {
        joinAttributes: [],
      },
    };

    transactionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    collectionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockCollectionQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    documentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockDocumentQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const userCompanyRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQueryBuilder),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,

        CollectionsReportsService,

        CourierReportsService,

        TransactionReportsService,
        AuditReportsService,
        DocumentReportsService,
        UserReportsService,
        EntityCodeReportsService,
        { provide: ServiceCatalogReportsService, useValue: {} },
        CompanyScopeHelper,
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(CollectionEntity),
          useValue: collectionRepo,
        },
        {
          provide: getRepositoryToken(AuditTrailEntity),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: documentRepo,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(TransactionServiceEntity),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(LandtraxAddressEntity),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(UserCompanyEntity),
          useValue: userCompanyRepo,
        },
        {
          provide: getRepositoryToken(EntityCodeEntity),
          useValue: mockRepo,
        },
        {
          provide: S3StorageService,
          useValue: { uploadFile: jest.fn(), getSignedUrl: jest.fn() },
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

  /**
   * Property 1: Bug Condition - ISO Date String Parsing Bug
   *
   * **Validates: Requirements 1.1, 1.2**
   *
   * This property-based test verifies that when dateTo contains a full ISO date string
   * with time component, the system should parse it correctly without throwing errors.
   *
   * EXPECTED OUTCOME ON UNFIXED CODE: This test will FAIL because the code appends
   * 'T23:59:59.999Z' to ISO strings, creating invalid dates like:
   * "2026-04-16T09:07:32.102ZT23:59:59.999Z"
   *
   * This failure confirms the bug exists and validates our root cause analysis.
   */
  describe('Property 1: Bug Condition - ISO Date String Parsing', () => {
    it('should handle ISO date strings with time component in transaction reports without errors', async () => {
      // Use scoped PBT approach with concrete failing cases for deterministic bug reproduction
      const buggyDateToExamples = [
        '2026-04-16T09:07:32.102Z', // Example from bug report
        '2026-04-16T00:00:00.000Z', // Midnight UTC
        '2025-12-31T23:59:59.999Z', // End of year
        '2024-01-01T12:30:45.678Z', // Mid-day
      ];

      await fc.assert(
        fc.asyncProperty(fc.constantFrom(...buggyDateToExamples), async (dateTo) => {
          // Reset mocks before each test run
          mockTransactionQueryBuilder.andWhere.mockClear();

          // Verify this is a bug condition input
          expect(isBugCondition(dateTo)).toBe(true);

          // Call the service method with ISO date string
          // EXPECTED: Should not throw an error
          // ACTUAL (unfixed): Will throw "Validation failed for parameter '1'. Invalid date."
          await expect(service.getTransactionReports({ dateTo })).resolves.not.toThrow();

          // Verify that the Date object created is valid
          // The andWhere call should receive a valid Date object
          const dateToCall =
            mockTransactionQueryBuilder.andWhere.mock.calls.find(isTargetCallTransaction);

          expect(dateToCall).toBeDefined();
          const dateParam = dateToCall[1].dateTo;

          // The Date object should be valid (not Invalid Date)
          expect(dateParam.toString()).not.toBe('Invalid Date');
        }),
        { numRuns: 4 }, // Run once for each concrete example
      );
    });

    it('should handle ISO date strings with time component in document reports without errors', async () => {
      const buggyDateToExamples = ['2026-04-16T09:07:32.102Z', '2026-04-16T00:00:00.000Z'];

      await fc.assert(
        fc.asyncProperty(fc.constantFrom(...buggyDateToExamples), async (dateTo) => {
          // Reset mocks before each test run
          mockDocumentQueryBuilder.andWhere.mockClear();

          expect(isBugCondition(dateTo)).toBe(true);

          await expect(service.getDocumentReports({ dateTo })).resolves.not.toThrow();

          const dateToCall =
            mockDocumentQueryBuilder.andWhere.mock.calls.find(isTargetCallDocument);

          expect(dateToCall).toBeDefined();
          const dateParam = dateToCall[1].dateTo;

          expect(dateParam).toBeInstanceOf(Date);
          expect(dateParam.toString()).not.toBe('Invalid Date');
          expect(dateParam.toISOString()).toBe(`${dateTo.split('T')[0]}T23:59:59.999Z`);
        }),
        { numRuns: 2 },
      );
    });
  });
});
