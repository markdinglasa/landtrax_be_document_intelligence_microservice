import { Test, TestingModule } from '@nestjs/testing';
import { DashboardAdminService } from '../../dashboard-admin-service';
import { DashboardClientService } from '../../dashboard-client-service';
import { DashboardHelperService } from '../../dashboard-helper-service';
import { DashboardServiceImpl } from '../../dashboard-service';
import { DashboardSummaryService } from '../../dashboard-summary-service';
import { DashboardWidgetService } from '../../dashboard-widget-service';

const mockReqContext = { userId: '1', ip: '127.0.0.1', userAgent: 'test-agent' } as any;

describe('DashboardServiceImpl', () => { 
  
  let service: DashboardServiceImpl;
  let helperService: jest.Mocked<DashboardHelperService>;
  let widgetService: jest.Mocked<DashboardWidgetService>;
  let summaryService: jest.Mocked<DashboardSummaryService>;
  let clientService: jest.Mocked<DashboardClientService>;
  let adminService: jest.Mocked<DashboardAdminService>;

  beforeEach(async () => {
    const mockHelperService = {
      getCompanyIdForUser: jest.fn(),
    };
    const mockWidgetService = {
      getWidgetsForUser: jest.fn(),
      getOrCreateClientWidgets: jest.fn(),
      createWidget: jest.fn(),
      updateWidget: jest.fn(),
      deleteWidget: jest.fn(),
      getWidgetById: jest.fn(),
    };
    const mockSummaryService = {
      transactionsSummary: jest.fn(),
      documentsSummary: jest.fn(),
      deliveriesSummary: jest.fn(),
      servicesDistribution: jest.fn(),
      paymentsSummary: jest.fn(),
    };
    const mockClientService = {
      clientStatistics: jest.fn(),
      clientTransactions: jest.fn(),
      clientDocumentStatistics: jest.fn(),
      clientDeliveryStatistics: jest.fn(),
      clientServiceStatistics: jest.fn(),
      clientPaymentStatistics: jest.fn(),
    };
    const mockAdminService = {
      adminKpis: jest.fn(),
      adminDocumentStatistics: jest.fn(),
      adminServiceStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardServiceImpl,
        { provide: DashboardHelperService, useValue: mockHelperService },
        { provide: DashboardWidgetService, useValue: mockWidgetService },
        { provide: DashboardSummaryService, useValue: mockSummaryService },
        { provide: DashboardClientService, useValue: mockClientService },
        { provide: DashboardAdminService, useValue: mockAdminService },
      ],
    }).compile();

    service = module.get<DashboardServiceImpl>(DashboardServiceImpl);
    helperService = module.get(DashboardHelperService);
    widgetService = module.get(DashboardWidgetService);
    summaryService = module.get(DashboardSummaryService);
    clientService = module.get(DashboardClientService);
    adminService = module.get(DashboardAdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompanyIdForUser', () => { 
  
    it('should call helperService.getCompanyIdForUser', async () => {
      helperService.getCompanyIdForUser.mockResolvedValue('company-id');
      const result = await service.getCompanyIdForUser('user-id');
      expect(helperService.getCompanyIdForUser).toHaveBeenCalledWith('user-id');
      expect(result).toBe('company-id');
    });
  });

  describe('getWidgetsForUser', () => { 
  
    it('should call widgetService.getWidgetsForUser', async () => {
      widgetService.getWidgetsForUser.mockResolvedValue([] as any);
      const result = await service.getWidgetsForUser('user-id', 'CLIENT' as any);
      expect(widgetService.getWidgetsForUser).toHaveBeenCalledWith('user-id', 'CLIENT');
      expect(result).toEqual([]);
    });
  });

  describe('getOrCreateClientWidgets', () => { 
  
    it('should call widgetService.getOrCreateClientWidgets', async () => {
      widgetService.getOrCreateClientWidgets.mockResolvedValue([] as any);
      const result = await service.getOrCreateClientWidgets('user-id');
      expect(widgetService.getOrCreateClientWidgets).toHaveBeenCalledWith('user-id');
      expect(result).toEqual([]);
    });
  });

  describe('createWidget', () => { 
  
    it('should call widgetService.createWidget', async () => {
      const dto = { title: 'New Widget' };
      widgetService.createWidget.mockResolvedValue({ id: '1', ...dto } as any);
      const result = await service.createWidget('user-id', dto);
      expect(widgetService.createWidget).toHaveBeenCalledWith('user-id', dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('updateWidget', () => { 
  
    it('should call widgetService.updateWidget', async () => {
      const dto = { title: 'Updated Widget' };
      widgetService.updateWidget.mockResolvedValue({ id: '1', ...dto } as any);
      const result = await service.updateWidget('1', dto);
      expect(widgetService.updateWidget).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('deleteWidget', () => { 
  
    it('should call widgetService.deleteWidget', async () => {
      widgetService.deleteWidget.mockResolvedValue();
      await service.deleteWidget('1');
      expect(widgetService.deleteWidget).toHaveBeenCalledWith('1');
    });
  });

  describe('getWidgetById', () => { 
  
    it('should call widgetService.getWidgetById', async () => {
      widgetService.getWidgetById.mockResolvedValue({ id: '1' } as any);
      const result = await service.getWidgetById('1');
      expect(widgetService.getWidgetById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('transactionsSummary', () => { 
  
    it('should call summaryService.transactionsSummary', async () => {
      summaryService.transactionsSummary.mockResolvedValue({} as any);
      const result = await service.transactionsSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
      );
      expect(summaryService.transactionsSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to summaryService.transactionsSummary', async () => {
      summaryService.transactionsSummary.mockResolvedValue({} as any);
      await service.transactionsSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
        'Corporate',
      );
      expect(summaryService.transactionsSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        'Corporate',
      );
    });
  });

  describe('documentsSummary', () => { 
  
    it('should call summaryService.documentsSummary', async () => {
      summaryService.documentsSummary.mockResolvedValue({} as any);
      const result = await service.documentsSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
      );
      expect(summaryService.documentsSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to summaryService.documentsSummary', async () => {
      summaryService.documentsSummary.mockResolvedValue({} as any);
      await service.documentsSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
        'Individual',
      );
      expect(summaryService.documentsSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        'Individual',
      );
    });
  });

  describe('deliveriesSummary', () => { 
  
    it('should call summaryService.deliveriesSummary', async () => {
      summaryService.deliveriesSummary.mockResolvedValue({} as any);
      const result = await service.deliveriesSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
      );
      expect(summaryService.deliveriesSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to summaryService.deliveriesSummary', async () => {
      summaryService.deliveriesSummary.mockResolvedValue({} as any);
      await service.deliveriesSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
        'Corporate',
      );
      expect(summaryService.deliveriesSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        'Corporate',
      );
    });
  });

  describe('servicesDistribution', () => { 
  
    it('should call summaryService.servicesDistribution', async () => {
      summaryService.servicesDistribution.mockResolvedValue({} as any);
      const result = await service.servicesDistribution(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
      );
      expect(summaryService.servicesDistribution).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to summaryService.servicesDistribution', async () => {
      summaryService.servicesDistribution.mockResolvedValue({} as any);
      await service.servicesDistribution(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
        'Individual',
      );
      expect(summaryService.servicesDistribution).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        'Individual',
      );
    });
  });

  describe('paymentsSummary', () => { 
  
    it('should call summaryService.paymentsSummary', async () => {
      summaryService.paymentsSummary.mockResolvedValue({} as any);
      const result = await service.paymentsSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
      );
      expect(summaryService.paymentsSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to summaryService.paymentsSummary', async () => {
      summaryService.paymentsSummary.mockResolvedValue({} as any);
      await service.paymentsSummary(
        'user-id',
        true,
        'company-id',
        'WEEK' as any,
        'company',
        'Corporate',
      );
      expect(summaryService.paymentsSummary).toHaveBeenCalledWith(
        'user-id',
        true,
        'company-id',
        'WEEK',
        'company',
        'Corporate',
      );
    });
  });

  describe('clientStatistics', () => { 
  
    it('should call clientService.clientStatistics', async () => {
      clientService.clientStatistics.mockResolvedValue({} as any);
      const result = await service.clientStatistics('user-id', 'WEEK' as any);
      expect(clientService.clientStatistics).toHaveBeenCalledWith('user-id', 'WEEK');
      expect(result).toEqual({});
    });
  });

  describe('clientTransactions', () => { 
  
    it('should call clientService.clientTransactions', async () => {
      clientService.clientTransactions.mockResolvedValue({} as any);
      const result = await service.clientTransactions('user-id', 'WEEK' as any);
      expect(clientService.clientTransactions).toHaveBeenCalledWith('user-id', 'WEEK');
      expect(result).toEqual({});
    });
  });

  describe('clientDocumentStatistics', () => { 
  
    it('should call clientService.clientDocumentStatistics', async () => {
      clientService.clientDocumentStatistics.mockResolvedValue({} as any);
      const result = await service.clientDocumentStatistics('user-id', 'WEEK' as any);
      expect(clientService.clientDocumentStatistics).toHaveBeenCalledWith('user-id', 'WEEK');
      expect(result).toEqual({});
    });
  });

  describe('clientDeliveryStatistics', () => { 
  
    it('should call clientService.clientDeliveryStatistics', async () => {
      clientService.clientDeliveryStatistics.mockResolvedValue({} as any);
      const result = await service.clientDeliveryStatistics('user-id', 'WEEK' as any);
      expect(clientService.clientDeliveryStatistics).toHaveBeenCalledWith('user-id', 'WEEK');
      expect(result).toEqual({});
    });
  });

  describe('clientServiceStatistics', () => { 
  
    it('should call clientService.clientServiceStatistics', async () => {
      clientService.clientServiceStatistics.mockResolvedValue({} as any);
      const result = await service.clientServiceStatistics('user-id', 'WEEK' as any);
      expect(clientService.clientServiceStatistics).toHaveBeenCalledWith('user-id', 'WEEK');
      expect(result).toEqual({});
    });
  });

  describe('adminKpis', () => { 
  
    it('should call adminService.adminKpis', async () => {
      adminService.adminKpis.mockResolvedValue({} as any);
      const result = await service.adminKpis('user-id', 'company-id', 'WEEK' as any, 'company');
      expect(adminService.adminKpis).toHaveBeenCalledWith(
        'user-id',
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to adminService.adminKpis', async () => {
      adminService.adminKpis.mockResolvedValue({} as any);
      await service.adminKpis('user-id', 'company-id', 'WEEK' as any, 'company', 'Corporate');
      expect(adminService.adminKpis).toHaveBeenCalledWith(
        'user-id',
        'company-id',
        'WEEK',
        'company',
        'Corporate',
      );
    });
  });

  describe('adminDocumentStatistics', () => { 
  
    it('should call adminService.adminDocumentStatistics', async () => {
      adminService.adminDocumentStatistics.mockResolvedValue({} as any);
      const result = await service.adminDocumentStatistics('user-id', 'WEEK' as any, 'company');
      expect(adminService.adminDocumentStatistics).toHaveBeenCalledWith(
        'user-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to adminService.adminDocumentStatistics', async () => {
      adminService.adminDocumentStatistics.mockResolvedValue({} as any);
      await service.adminDocumentStatistics('user-id', 'WEEK' as any, 'company', 'Individual');
      expect(adminService.adminDocumentStatistics).toHaveBeenCalledWith(
        'user-id',
        'WEEK',
        'company',
        'Individual',
      );
    });
  });

  describe('adminServiceStatistics', () => { 
  
    it('should call adminService.adminServiceStatistics', async () => {
      adminService.adminServiceStatistics.mockResolvedValue({} as any);
      const result = await service.adminServiceStatistics(
        'user-id',
        'company-id',
        'WEEK' as any,
        'company',
      );
      expect(adminService.adminServiceStatistics).toHaveBeenCalledWith(
        'user-id',
        'company-id',
        'WEEK',
        'company',
        undefined,
      );
      expect(result).toEqual({});
    });

    it('should pass userType to adminService.adminServiceStatistics', async () => {
      adminService.adminServiceStatistics.mockResolvedValue({} as any);
      await service.adminServiceStatistics(
        'user-id',
        'company-id',
        'WEEK' as any,
        'company',
        'Corporate',
      );
      expect(adminService.adminServiceStatistics).toHaveBeenCalledWith(
        'user-id',
        'company-id',
        'WEEK',
        'company',
        'Corporate',
      );
    });
  });
});
