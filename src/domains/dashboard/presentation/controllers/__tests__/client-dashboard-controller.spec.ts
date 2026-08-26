import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../../types';
import { ClientDashboardController } from '../client-dashboard-controller';

describe('ClientDashboardController', () => {
  let controller: ClientDashboardController;

  const mockDashboardService = {
    getOrCreateClientWidgets: jest.fn(),
    createWidget: jest.fn(),
    updateWidget: jest.fn(),
    deleteWidget: jest.fn(),
    transactionsSummary: jest.fn(),
    documentsSummary: jest.fn(),
    deliveriesSummary: jest.fn(),
    servicesDistribution: jest.fn(),
    paymentsSummary: jest.fn(),
    clientStatistics: jest.fn(),
    clientTransactions: jest.fn(),
    clientDocumentStatistics: jest.fn(),
    clientDeliveryStatistics: jest.fn(),
    clientServiceStatistics: jest.fn(),
    clientPaymentStatistics: jest.fn(),
    getWidgetById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientDashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    }).compile();

    controller = module.get<ClientDashboardController>(ClientDashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
