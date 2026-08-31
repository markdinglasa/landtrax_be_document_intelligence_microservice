import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import { Repository } from 'typeorm';
import { DashboardAdminService } from '../../dashboard-admin-service';
import { DashboardHelperService } from '../../dashboard-helper-service';
import { DashboardSummaryService } from '../../dashboard-summary-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('DashboardAdminService', () => { 
  
  let service: DashboardAdminService;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let transactionRepo: jest.Mocked<Repository<TransactionEntity>>;
  let collectionRepo: jest.Mocked<Repository<CollectionEntity>>;
  let serviceRepo: jest.Mocked<Repository<ServiceEntity>>;
  let helperService: jest.Mocked<DashboardHelperService>;
  let summaryService: jest.Mocked<DashboardSummaryService>;

  beforeEach(async () => {
    const createMockQueryBuilder = () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        clone: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getCount: jest.fn(),
        leftJoin: jest.fn().mockReturnThis(),
      };
      qb.clone.mockReturnValue(qb);
      return qb;
    };

    const mockUserRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };
    const mockTransactionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };
    const mockCollectionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    };
    const mockServiceRepo = {
      find: jest.fn(),
    };
    const mockHelperService = {
      resolveCompanyIdByName: jest.fn(),
      resolveUserScope: jest.fn(),
    };
    const mockSummaryService = {
      getDocumentStatistics: jest.fn(),
      widgetTransactions: jest.fn(),
      servicesDistribution: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardAdminService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: getRepositoryToken(TransactionEntity), useValue: mockTransactionRepo },
        { provide: getRepositoryToken(CollectionEntity), useValue: mockCollectionRepo },
        { provide: getRepositoryToken(ServiceEntity), useValue: mockServiceRepo },
        { provide: DashboardHelperService, useValue: mockHelperService },
        { provide: DashboardSummaryService, useValue: mockSummaryService },
      ],
    }).compile();

    service = module.get<DashboardAdminService>(DashboardAdminService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    transactionRepo = module.get(getRepositoryToken(TransactionEntity));
    collectionRepo = module.get(getRepositoryToken(CollectionEntity));
    serviceRepo = module.get(getRepositoryToken(ServiceEntity));
    helperService = module.get(DashboardHelperService);
    summaryService = module.get(DashboardSummaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('adminDocumentStatistics', () => { 
  
    it('should return empty if no userIds', async () => {
      helperService.resolveUserScope.mockResolvedValue([]);
      const result = await service.adminDocumentStatistics();
      expect(result.statistics).toEqual([]);
      expect(result.byEntity).toEqual([]);
      expect(result.byStage).toEqual([]);
      expect(result.transactions).toEqual([]);
    });

    it('should resolve company and return document stats', async () => {
      helperService.resolveCompanyIdByName.mockResolvedValue('comp-1');
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      summaryService.getDocumentStatistics.mockResolvedValue({
        statistics: [{ label: 'Total', value: '1' }],
        byEntity: [],
        byStage: [],
      } as any);
      summaryService.widgetTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const result = await service.adminDocumentStatistics('u1', undefined, 'My Comp');
      expect(helperService.resolveCompanyIdByName).toHaveBeenCalledWith('My Comp');
      expect(result.statistics).toEqual([{ label: 'Total', value: '1' }]);
      expect(result.transactions).toEqual([{ id: 'tx-1' }]);
    });
  });

  describe('adminServiceStatistics', () => { 
  
    it('should return empty if no userIds', async () => {
      helperService.resolveUserScope.mockResolvedValue([]);
      const result = await service.adminServiceStatistics('us1');
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.transactions).toEqual([]);
    });

    it('should return service statistics', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      serviceRepo.find.mockResolvedValue([{ name: 'S1', serviceCode: 'S1' }] as any);
      summaryService.servicesDistribution.mockResolvedValue({
        items: [{ code: 'S1', count: 5 }],
      } as any);
      summaryService.widgetTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const result = await service.adminServiceStatistics('u1');
      expect(result.total).toBe(5);
      expect(result.data[0].name).toBe('S1');
      expect(result.data[0].value).toBe(5);
      expect(result.transactions).toEqual([{ id: 'tx-1' }]);
    });
  });

  describe('adminKpis', () => { 
  
    it('should calculate KPIs', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);

      const userQb = userRepo.createQueryBuilder() as any;
      userQb.getRawOne.mockResolvedValue({ count: '10' });

      const txQb = transactionRepo.createQueryBuilder() as any;
      txQb.getCount.mockResolvedValue(20);

      const colQb = collectionRepo.createQueryBuilder() as any;
      colQb.getRawOne.mockResolvedValue({ amount: '1000' });

      const result = await service.adminKpis('u1');
      expect(result.cards.totalUsers.changePct).toBe(0);
      expect(result.cards.totalTransactions.value).toBe(20);
      expect(result.cards.pendingTransactions.value).toBe(20);
      expect(result.cards.revenueThisMonth.value).toBe(1000);
    });
  });
});
