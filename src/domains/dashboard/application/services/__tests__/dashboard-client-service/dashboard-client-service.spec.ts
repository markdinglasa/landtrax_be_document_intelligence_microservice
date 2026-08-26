import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection-entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-entity';
import { Repository } from 'typeorm';
import { DashboardClientService } from '../../dashboard-client-service';
import { DashboardHelperService } from '../../dashboard-helper-service';
import { DashboardSummaryService } from '../../dashboard-summary-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('DashboardClientService', () => { 
  
  let service: DashboardClientService;
  let serviceRepo: jest.Mocked<Repository<ServiceEntity>>;
  let collectionRepo: jest.Mocked<Repository<CollectionEntity>>;
  let summaryService: jest.Mocked<DashboardSummaryService>;
  let helperService: jest.Mocked<DashboardHelperService>;

  beforeEach(async () => {
    const mockServiceRepo = {
      find: jest.fn(),
    };
    const mockCollectionRepo = {
      createQueryBuilder: jest.fn(),
    };
    const mockSummaryService = {
      transactionsSummary: jest.fn(),
      documentsSummary: jest.fn(),
      paymentsSummary: jest.fn(),
      widgetTransactions: jest.fn(),
      getDocumentStatistics: jest.fn(),
      deliveriesSummary: jest.fn(),
      servicesDistribution: jest.fn(),
    };
    const mockHelperService = {
      resolveUserScope: jest.fn(),
      getEffectiveRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardClientService,
        {
          provide: getRepositoryToken(ServiceEntity),
          useValue: mockServiceRepo,
        },
        {
          provide: getRepositoryToken(CollectionEntity),
          useValue: mockCollectionRepo,
        },
        {
          provide: DashboardSummaryService,
          useValue: mockSummaryService,
        },
        {
          provide: DashboardHelperService,
          useValue: mockHelperService,
        },
      ],
    }).compile();

    service = module.get<DashboardClientService>(DashboardClientService);
    serviceRepo = module.get(getRepositoryToken(ServiceEntity));
    summaryService = module.get(DashboardSummaryService);
    helperService = module.get(DashboardHelperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clientStatistics', () => { 
  
    it('should return combined statistics', async () => {
      summaryService.transactionsSummary.mockResolvedValue({
        total: 10,
        items: [{ label: 'Pending', count: 5 }],
      } as any);
      summaryService.documentsSummary.mockResolvedValue({ total: 20, items: [] } as any);
      summaryService.paymentsSummary.mockResolvedValue({
        total: 5,
        items: [{ label: 'Pending', count: 2 }],
      } as any);

      const result = await service.clientStatistics('user-1');

      expect(result.transactions.total).toBe(10);
      expect(result.transactions.byStatus).toEqual([{ status: 'Pending', count: '5' }]);
      expect(result.documents.total).toBe(20);
      expect(result.payments.pending).toBe(2);
    });
  });

  describe('clientTransactions', () => { 
  
    it('should return transactions summary and list', async () => {
      summaryService.transactionsSummary.mockResolvedValue({
        total: 10,
        items: [{ label: 'Pending', count: 5 }],
      } as any);
      summaryService.widgetTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const result = await service.clientTransactions('user-1');

      expect(result.total).toBe(10);
      expect(result.byStatus).toEqual([{ status: 'Pending', count: '5' }]);
      expect(result.transactions).toEqual([{ id: 'tx-1' }]);
    });
  });

  describe('clientDocumentStatistics', () => { 
  
    it('should return empty stats if no userIds resolved', async () => {
      helperService.resolveUserScope.mockResolvedValue([]);

      const result = await service.clientDocumentStatistics('user-1');
      expect(result.statistics[0].value).toBe('0');
      expect(result.byEntity).toEqual([]);
      expect(result.byStage).toEqual([]);
    });

    it('should return document statistics', async () => {
      helperService.resolveUserScope.mockResolvedValue(['user-1']);
      summaryService.getDocumentStatistics.mockResolvedValue({
        statistics: [{ label: 'Total', value: '10' }],
        byEntity: [],
        byStage: [],
      } as any);

      const result = await service.clientDocumentStatistics('user-1');
      expect(result.statistics[0].value).toBe('10');
    });
  });

  describe('clientDeliveryStatistics', () => { 
  
    it('should return mapped delivery statistics', async () => {
      summaryService.deliveriesSummary.mockResolvedValue({
        total: 5,
        items: [
          { label: 'Out for Delivery', count: 2 },
          { label: 'Delivered', count: 3 },
        ],
      } as any);
      summaryService.widgetTransactions.mockResolvedValue([{ id: 'tx-1' }] as any);

      const result = await service.clientDeliveryStatistics('user-1');

      expect(result.total).toBe(5);
      expect(result.summary.inTransit).toBe(2);
      expect(result.summary.completed).toBe(3);
      expect(result.summary.completionRate).toBe(60);
      expect(result.transactions).toEqual([{ id: 'tx-1' }]);
      expect(result.data[1].name).toBe('Out for Delivery');
      expect(result.data[1].fill).toBe('#f97316');
    });
  });

  describe('clientServiceStatistics', () => { 
  
    it('should return service statistics mapping', async () => {
      serviceRepo.find.mockResolvedValue([
        { name: 'Service A', serviceCode: 'A' },
        { name: 'Service B', serviceCode: 'B' },
      ] as any);
      summaryService.widgetTransactions.mockResolvedValue([{ id: '1' }, { id: '2' }] as any);
      summaryService.servicesDistribution.mockResolvedValue({
        total: 2,
        items: [{ code: 'A', count: 2 }],
      } as any);

      const result = await service.clientServiceStatistics('user-1');

      expect(result.total).toBe(2);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Service A', value: 2, code: 'A' }),
          expect.objectContaining({ name: 'Service B', value: 0, code: 'B' }),
        ]),
      );
      expect(result.topServices[0].percentage).toBe(100);
    });
  });
});
