import { Test, TestingModule } from '@nestjs/testing';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ServiceCatalogReportsQueryDto } from 'src/domains/reports/application/dtos/service-catalog-reports-query.dto';
import ReportsService from 'src/domains/reports/application/services/reports-service';
import { ServiceCatalogReportsController } from '../service-catalog-reports-controller';

describe('ServiceCatalogReportsController', () => {
  let controller: ServiceCatalogReportsController;
  let reportsService: jest.Mocked<ReportsService>;

  beforeEach(async () => {
    const mockReportsService = {
      getServiceCatalogReports: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceCatalogReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    }).overrideGuard(PermissionGuard).useValue({ canActivate: jest.fn(() => true) }).compile();

    controller = module.get<ServiceCatalogReportsController>(ServiceCatalogReportsController);
    reportsService = module.get(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call ReportsService.getServiceCatalogReports with query params', async () => {
    const mockQuery: ServiceCatalogReportsQueryDto = { page: 2, limit: 20, search: 'test' };
    const mockResult = { data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } };

    reportsService.getServiceCatalogReports.mockResolvedValue(mockResult as any);

    const result = await controller.getServiceCatalogReports(mockQuery);

    expect(reportsService.getServiceCatalogReports).toHaveBeenCalledWith(mockQuery);
    expect(result).toEqual(mockResult);
  });
});
