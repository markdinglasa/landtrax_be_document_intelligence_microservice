import { Test, TestingModule } from '@nestjs/testing';
import { PermissionGuard } from 'src/modules/authentication/utils/permission-guard';
import { RequestContextDto } from 'src/utils';
import { CourierReportsQueryDto } from '../../dtos/courier-reports-query.dto';
import ReportsService from '../../services/reports-service';
import { CourierReportsController } from '../courier-reports-controller';

describe('CourierReportsController', () => {
  let controller: CourierReportsController;
  let reportsService: ReportsService;

  const mockReqContext: RequestContextDto = {
    userId: 'test-user-id',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  beforeEach(async () => {
    const mockReportsService = {
      getCourierReports: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourierReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: mockReportsService,
        },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CourierReportsController>(CourierReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCourierReports', () => {
    it('should call ReportsService.getCourierReports with the correct query dto', async () => {
      const query = new CourierReportsQueryDto();
      query.page = 1;
      query.limit = 20;

      const result = await controller.getCourierReports(mockReqContext, query);

      expect(reportsService.getCourierReports).toHaveBeenCalledWith('test-user-id', query);
      expect(result).toEqual({ data: [], meta: { total: 0 } });
    });
  });
});
