import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection-entity';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document-entity';
import StagingEntity from 'src/shared/infrastructure/database/entities/staging-entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction-entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service-entity';
import { Repository } from 'typeorm';
import { DashboardHelperService } from '../../dashboard-helper-service';
import { DashboardSummaryService } from '../../dashboard-summary-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('DashboardSummaryService', () => { 
  
  let service: DashboardSummaryService;
  let transactionRepo: jest.Mocked<Repository<TransactionEntity>>;
  let transactionServiceRepo: jest.Mocked<Repository<TransactionServiceEntity>>;
  let documentRepo: jest.Mocked<Repository<DocumentEntity>>;
  let stagingRepo: jest.Mocked<Repository<StagingEntity>>;
  let helperService: jest.Mocked<DashboardHelperService>;

  beforeEach(async () => {
    const createMockQueryBuilder = () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      return qb;
    };

    const mockRepo = () => ({
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
      },
    });

    const mockHelperService = {
      resolveUserScope: jest.fn(),
      getEffectiveRange: jest.fn().mockReturnValue({ from: 'a', to: 'b' }),
      resolveCompanyIdByName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardSummaryService,
        { provide: getRepositoryToken(TransactionEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(TransactionServiceEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(CollectionEntity), useValue: mockRepo() },
        { provide: getRepositoryToken(StagingEntity), useValue: mockRepo() },
        { provide: DashboardHelperService, useValue: mockHelperService },
      ],
    }).compile();

    service = module.get<DashboardSummaryService>(DashboardSummaryService);
    transactionRepo = module.get(getRepositoryToken(TransactionEntity));
    transactionServiceRepo = module.get(getRepositoryToken(TransactionServiceEntity));
    documentRepo = module.get(getRepositoryToken(DocumentEntity));
    stagingRepo = module.get(getRepositoryToken(StagingEntity));
    helperService = module.get(DashboardHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('widgetTransactions', () => { 
  
    it('should build query and return transactions', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = transactionServiceRepo.createQueryBuilder() as any;

      qb.getRawMany.mockResolvedValue([
        {
          companyName: 'Comp',
          transactionNumber: '123',
          service: 'Serv',
          lastModified: '2023-01-01T00:00:00Z',
          createdDate: '2023-01-01T00:00:00Z',
        },
      ]);

      const result = await service.widgetTransactions({ userId: 'u1' });
      expect(qb.getRawMany).toHaveBeenCalled();
      expect(result.length).toBe(1);
    });

    it('should handle type document', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = transactionServiceRepo.createQueryBuilder() as any;
      await service.widgetTransactions({ type: 'document' });
      expect(qb.andWhere).toHaveBeenCalledWith('sts_staging.source = :docSource', {
        docSource: 'Secondary',
      });
    });

    it('should handle type delivery', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = transactionServiceRepo.createQueryBuilder() as any;
      await service.widgetTransactions({ type: 'delivery' });
      expect(qb.innerJoin).toHaveBeenCalledWith(
        'sts.staging',
        'sts_staging',
        'sts_staging.code = :stagingCode',
        expect.any(Object),
      );
    });
  });

  describe('transactionsSummary', () => { 
  
    it('should build query and return items', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = stagingRepo.createQueryBuilder() as any;
      qb.getRawMany.mockResolvedValue([{ label: 'Pending', count: '10' }]);

      jest.spyOn(service, 'widgetTransactions').mockResolvedValue([]);

      const result = await service.transactionsSummary('u1');
      expect(result.total).toBe(10);
      expect(result.items[0]).toEqual({ label: 'Pending', count: 10 });
    });

    it('should return empty if no userIds', async () => {
      helperService.resolveUserScope.mockResolvedValue([]);
      const result = await service.transactionsSummary('u1');
      expect(result.total).toBe(0);
    });
  });

  describe('documentsSummary', () => { 
  
    it('should build query and return documents summary', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = documentRepo.createQueryBuilder() as any;
      qb.getRawMany.mockResolvedValue([{ label: 'Cat', count: '5' }]);

      jest.spyOn(service, 'widgetTransactions').mockResolvedValue([]);

      const result = await service.documentsSummary('u1');
      expect(result.total).toBe(5);
      expect(result.items[0]).toEqual({ label: 'Cat', count: 5 });
    });
  });

  describe('deliveriesSummary', () => { 
  
    it('should build query and return delivery items', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = stagingRepo.manager.createQueryBuilder() as any;
      qb.getRawMany.mockResolvedValue([{ label: 'Delivered', code: 'DEL', count: '3' }]);

      jest.spyOn(service, 'widgetTransactions').mockResolvedValue([]);

      const result = await service.deliveriesSummary('u1');
      expect(result.total).toBe(3);
      expect(result.items[0]).toEqual({ label: 'Delivered', code: 'DEL', count: 3 });
    });
  });

  describe('servicesDistribution', () => { 
  
    it('should build query and return service items', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = transactionServiceRepo.createQueryBuilder() as any;
      qb.getRawMany.mockResolvedValue([{ label: 'Serv A', code: 'A', count: '2' }]);

      jest.spyOn(service, 'widgetTransactions').mockResolvedValue([]);

      const result = await service.servicesDistribution('u1');
      expect(result.total).toBe(2);
      expect(result.items[0]).toEqual({ label: 'Serv A', code: 'A', count: 2 });
    });
  });

  describe('paymentsSummary', () => { 
  
    it('should build query and return payment items including transactions without collections mapped to Pending', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);

      const qb = transactionRepo.createQueryBuilder() as any;
      // Let's pretend it returns 'Pending' for NULL collections, and 'Paid' for some.
      qb.getRawMany.mockResolvedValue([
        { label: 'Paid', count: '7' },
        { label: 'Pending', count: '3' },
      ]);

      jest.spyOn(service, 'widgetTransactions').mockResolvedValue([]);

      const result = await service.paymentsSummary('u1');
      expect(result.total).toBe(10);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({ label: 'Paid', count: 7 });
      expect(result.items[1]).toEqual({ label: 'Pending', count: 3 });

      // Verify the SELECT logic
      expect(qb.select).toHaveBeenCalledWith("ISNULL(t.paymentStatus, 'Pending')", 'label');
      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(t.id)', 'count');
      expect(qb.groupBy).toHaveBeenCalledWith("ISNULL(t.paymentStatus, 'Pending')");

      // Verify exclusions
      expect(qb.leftJoin).toHaveBeenCalledWith('t.staging', 'pst');
      expect(qb.andWhere).toHaveBeenCalledWith('pst.code <> :draftCode', { draftCode: 'DRAFT' });
      expect(qb.andWhere).toHaveBeenCalledWith('pst.code <> :eosApprovalCode', {
        eosApprovalCode: 'FOR_EOS_APPROVAL',
      });

      // Assuming a mock call with a range is added, we would verify:
      // expect(qb.andWhere).toHaveBeenCalledWith(
      //   'CAST(ISNULL(t.updatedDate, t.createdDate) AS DATE) BETWEEN :from AND :to', ...
      // );
    });
  });

  describe('getDocumentStatistics', () => { 
  
    it('should build query and return document stats grouping', async () => {
      helperService.resolveUserScope.mockResolvedValue(['u1']);
      const qb = stagingRepo.createQueryBuilder() as any;
      qb.getRawMany.mockResolvedValue([
        {
          entityName: 'BIR',
          entityCode: 'BIR',
          statusName: 'Pending',
          findingName: null,
          count: '5',
        },
      ]);

      jest.spyOn(service, 'widgetTransactions').mockResolvedValue([]);

      const result = await service.getDocumentStatistics(['u1'], undefined, 'u1');
      expect(result.statistics[0].value).toBe('5');
      expect(result.byEntity[0].name).toBe('BIR');
      expect(result.byEntity[0].value).toBe(5);
      expect(result.byStage[0].name).toBe('BIR-Pending-none');
    });
  });
});
