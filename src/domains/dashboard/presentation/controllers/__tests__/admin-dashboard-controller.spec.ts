import { Test, TestingModule } from '@nestjs/testing';
import { AuditTrailService } from 'src/modules/audit-trail/types';
import { RequestContextDto } from 'src/utils/req-context.decorator';
import { DashboardService } from '../../types';
import { AdminDashboardController } from '../admin-dashboard-controller';

const mockReqContext: RequestContextDto = {
  userId: 'admin-1',
  ip: '127.0.0.1',
  userAgent: 'test-agent',
};

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;
  let service: any;

  const mockDashboardService = {
    getWidgetsForUser: jest.fn(),
    createWidget: jest.fn(),
    updateWidget: jest.fn(),
    deleteWidget: jest.fn(),
    transactionsSummary: jest.fn(),
    documentsSummary: jest.fn(),
    deliveriesSummary: jest.fn(),
    servicesDistribution: jest.fn(),
    paymentsSummary: jest.fn(),
    getCompanyIdForUser: jest.fn(),
    adminKpis: jest.fn(),
    adminWidgetTransactions: jest.fn(),
    adminDocumentStatistics: jest.fn(),
    adminServiceStatistics: jest.fn(),
    getWidgetById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
        {
          provide: AuditTrailService,
          useValue: { record: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AdminDashboardController>(AdminDashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWidgets', () => {
    it('should return widgets for the current admin user', async () => {
      const mockWidgets = [{ id: '1', title: 'Admin Widget 1' }];
      service.getWidgetsForUser.mockResolvedValue(mockWidgets);

      const result = await controller.getWidgets(mockReqContext);

      expect(result).toEqual([
        {
          id: '1',
          title: 'Admin Widget 1',
          description: null,
          type: undefined,
          chartType: undefined,
          size: undefined,
          position: undefined,
          row: undefined,
          column: 0,
          col: undefined,
          width: undefined,
          height: undefined,
          isVisible: undefined,
          isResizable: undefined,
          isDraggable: undefined,
          configuration: null,
          filter: null,
          dataSource: null,
          customQuery: null,
          colorScheme: null,
          userId: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          showLegend: false,
          showGrid: false,
          animationEnabled: true,
          refreshInterval: undefined,
        },
      ]);
      expect(service.getWidgetsForUser).toHaveBeenCalledWith('admin-1', 'admin');
    });
  });

  describe('transactionsSummary', () => {
    it('should return transaction summary for admin scope', async () => {
      const mockSummary = { total: 100, items: [] };
      service.getCompanyIdForUser.mockResolvedValue('company-1');
      service.transactionsSummary.mockResolvedValue(mockSummary);

      const result = await controller.transactionsSummary(
        mockReqContext,
        undefined,
        undefined,
        '2025-01-01',
        '2025-01-31',
      );

      expect(result).toEqual({
        total: 100,
        change: 0,
        changeType: 'neutral',
        items: [],
      });
      expect(service.getCompanyIdForUser).toHaveBeenCalledWith('admin-1');
      expect(service.transactionsSummary).toHaveBeenCalledWith(
        'admin-1',
        true,
        'company-1',
        { from: '2025-01-01', to: '2025-01-31' },
        undefined,
        undefined,
      );
    });

    it('should pass userType to transactionsSummary', async () => {
      const mockSummary = { total: 50, items: [] };
      service.getCompanyIdForUser.mockResolvedValue('company-1');
      service.transactionsSummary.mockResolvedValue(mockSummary);

      await controller.transactionsSummary(
        mockReqContext,
        undefined,
        undefined,
        '2025-01-01',
        '2025-01-31',
        undefined,
        'Corporate',
      );

      expect(service.transactionsSummary).toHaveBeenCalledWith(
        'admin-1',
        true,
        'company-1',
        { from: '2025-01-01', to: '2025-01-31' },
        undefined,
        'Corporate',
      );
    });
  });
});
