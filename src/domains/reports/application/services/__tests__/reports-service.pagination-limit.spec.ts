import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import AuditExportJobEntity from 'src/shared/infrastructure/database/entities/audit-export-job-entity';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail-entity';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection-entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document-entity';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code-entity';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address-entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction-entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service-entity';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
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

describe('ReportsService Facade - Pagination Limit (Bug Exploration)', () => {
  let facade: ReportsService;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
      getCount: jest.fn().mockResolvedValue(100),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({}),
      expressionMap: {
        mainAlias: { name: 'ts' },
        joinAttributes: [],
      },
    };

    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn().mockResolvedValue({ id: 'system-id' }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,

        CourierReportsService,
        CollectionsReportsService,
        TransactionReportsService,
        AuditReportsService,
        DocumentReportsService,
        UserReportsService,
        EntityCodeReportsService,
        { provide: ServiceCatalogReportsService, useValue: {} },
        CompanyScopeHelper,
        { provide: getRepositoryToken(TransactionEntity), useValue: mockRepo },
        { provide: getRepositoryToken(CollectionEntity), useValue: mockRepo },
        { provide: getRepositoryToken(AuditTrailEntity), useValue: mockRepo },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockRepo },
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: mockRepo },
        { provide: getRepositoryToken(LandtraxAddressEntity), useValue: {} },

        { provide: getRepositoryToken(UserCompanyEntity), useValue: mockRepo },
        { provide: getRepositoryToken(EntityCodeEntity), useValue: mockRepo },
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

    facade = module.get<ReportsService>(ReportsService);
  });

  describe('Property 1: Bug Condition - User-Specified Limit Ignored', () => {
    const testLimits = ['1', '10', '25', '50', '100'];

    it.each(testLimits)(
      'returns correct limit for courier reports when limit=%p',
      async (limit) => {
        await facade.getCourierReports('user-1', { limit: Number(limit) });
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(Number(limit));
      },
    );

    /*// disabled it.each(testLimits)(
      'returns correct limit for collections reports when limit=%p',
      async (limit) => {
        await facade.getCollectionsReports({ limit: Number(limit) });
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(Number(limit));
      },
    );*/

    it.each(testLimits)(
      'returns correct limit for transaction reports when limit=%p',
      async (limit) => {
        await facade.getTransactionReports({ limit: Number(limit) });
        expect(mockQueryBuilder.limit).toHaveBeenCalledWith(Number(limit));
      },
    );

    it.each(testLimits)('returns correct limit for audit reports when limit=%p', async (limit) => {
      await facade.getAuditReports({ limit: Number(limit) });
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(Number(limit));
    });

    it.each(testLimits)(
      'returns correct limit for document reports when limit=%p',
      async (limit) => {
        await facade.getDocumentReports({ limit: Number(limit) });
        expect(mockQueryBuilder.take).toHaveBeenCalledWith(Number(limit));
      },
    );

    it.each(testLimits)('returns correct limit for user reports when limit=%p', async (limit) => {
      await facade.getUserReports({ limit: Number(limit) });
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(Number(limit));
    });
  });

  describe('Property 2: Preservation - Default Limits', () => {
    it('uses default limit of 10 for courier reports', async () => {
      await facade.getCourierReports('user-1', {});
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('uses default limit of 25 for other reports', async () => {
      // disabled await facade.getCollectionsReports({});
      // disabled expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);

      await facade.getTransactionReports({});
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);

      await facade.getAuditReports({});
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);

      await facade.getDocumentReports({});
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);

      await facade.getUserReports({});
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(25);
    });
  });

  describe('Property 3: Facade Delegation', () => {
    it('facade delegates getCourierReports to CourierReportsService', async () => {
      const courierService = (facade as any).courierReportsService;
      const spy = jest.spyOn(courierService, 'getCourierReports');
      await facade.getCourierReports('user-1', { limit: 5 });
      expect(spy).toHaveBeenCalledWith('user-1', { limit: 5 });
    });

    it('facade delegates getAuditReports to AuditReportsService', async () => {
      const auditService = (facade as any).auditReportsService;
      const spy = jest.spyOn(auditService, 'getAuditReports');
      await facade.getAuditReports({ limit: 5 });
      expect(spy).toHaveBeenCalledWith({ limit: 5 });
    });

    /* disabled 
    // it('facade delegates getCollectionsReports to CollectionsReportsService', async () => {
    //   const collectionsService = (facade as any).collectionsReportsService;
    //   const spy = jest.spyOn(collectionsService, 'getCollectionsReports');
    //   await facade.getCollectionsReports({ limit: 5 });
    //   expect(spy).toHaveBeenCalledWith({ limit: 5 });
    // });
    */

    it('facade delegates getUserReports to UserReportsService', async () => {
      const userService = (facade as any).userReportsService;
      const spy = jest.spyOn(userService, 'getUserReports');
      await facade.getUserReports({ limit: 5 });
      expect(spy).toHaveBeenCalledWith({ limit: 5 });
    });

    it('facade delegates getDocumentReports to DocumentReportsService', async () => {
      const docService = (facade as any).documentReportsService;
      const spy = jest.spyOn(docService, 'getDocumentReports');
      await facade.getDocumentReports({ limit: 5 });
      expect(spy).toHaveBeenCalledWith({ limit: 5 });
    });

    it('facade delegates getEntityCodeReports to EntityCodeReportsService', async () => {
      const entityCodeService = (facade as any).entityCodeReportsService;
      const spy = jest.spyOn(entityCodeService, 'getEntityCodeReports');
      await facade.getEntityCodeReports({ limit: 5 });
      expect(spy).toHaveBeenCalledWith({ limit: 5 });
    });
  });
});
