import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { USER_TYPE } from 'src/shared/common';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import { CourierReportsQueryDto } from '../../dtos/courier-reports-query.dto';
import { CourierReportsService } from '../courier-reports-service';

describe('CourierReportsService', () => {
  let service: CourierReportsService;
  let mockQueryBuilder: any;
  let mockTransactionServiceRepo: any;
  let mockUserRepo: any;
  let mockLandtraxAddressRepo: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndMapOne: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockTransactionServiceRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockUserRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ type: USER_TYPE.ADMINISTRATOR, streetAddress: '123 Main' }),
    };

    mockLandtraxAddressRepo = {
      findOne: jest.fn().mockResolvedValue({ name: 'HQ', streetAddress: '123 Main' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourierReportsService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(TransactionServiceEntity),
          useValue: mockTransactionServiceRepo,
        },
        {
          provide: getRepositoryToken(LandtraxAddressEntity),
          useValue: mockLandtraxAddressRepo,
        },
      ],
    }).compile();

    service = module.get<CourierReportsService>(CourierReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCourierReports', () => {
    it('should query the database and return mapped data', async () => {
      const mockTransactionServices = [
        {
          transactionServiceNumber: 'TS-001',
          trackingNumber: 'TRK-001',
          courier: { name: 'LBC' },
          stagingStatus: { name: 'Delivered' },
          transaction: {
            transactionNumber: 'TX-001',
            deliveryMethod: 'door-to-door',
            deliveryAddress: '123 Test St',
            location: { name: 'Manila' },
            recipients: [{ name: 'John Doe' }],
          },
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTransactionServices, 1]);

      const filters = new CourierReportsQueryDto();
      const result = await service.getCourierReports('user-id', filters);

      expect(mockTransactionServiceRepo.createQueryBuilder).toHaveBeenCalledWith(
        'transactionServices',
      );
      expect(result.data.length).toBe(1);
      expect(result.data[0]).toEqual({
        transactionNumber: 'TX-001',
        transactionServiceNumber: 'TS-001',
        trackingNumber: 'TRK-001',
        courierProvider: 'LBC',
        deliveryMethod: 'door to door',
        deliveryAddress: '123 Test St',
        status: 'Delivered',
        location: 'Manila',
        recipient: 'John Doe',
      });
      expect(result.meta.total).toBe(1);
    });

    it('should apply date filters correctly', async () => {
      const filters = new CourierReportsQueryDto();
      filters.dateFrom = '2025-01-01';
      filters.dateTo = '2025-12-31';

      await service.getCourierReports('user-id', filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.createdDate BETWEEN :dateFrom AND :dateTo',
        expect.any(Object),
      );
    });

    it('should apply status, provider, and region filters correctly', async () => {
      const filters = new CourierReportsQueryDto();
      filters.status = 'OUT_FOR_DELIVERY';
      filters.courierProvider = 'J&T';

      await service.getCourierReports('user-id', filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('status.code IN (:...status)', {
        status: ['OUT_FOR_DELIVERY'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('courierProvider.name = :provider', {
        provider: 'J&T',
      });
    });

    it('should handle missing transactionServices gracefully', async () => {
      const mockTransactionServices = [
        {
          transactionServiceNumber: 'TS-002',
          transaction: null,
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockTransactionServices, 1]);

      const filters = new CourierReportsQueryDto();
      const result = await service.getCourierReports('user-id', filters);

      expect(result.data[0]).toEqual({
        transactionNumber: '',
        transactionServiceNumber: 'TS-002',
        trackingNumber: '',
        courierProvider: '',
        deliveryMethod: undefined,
        deliveryAddress: '',
        status: undefined,
        location: '',
        recipient: undefined,
      });
    });

    it('should handle errors and return empty result', async () => {
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('DB Error'));

      const filters = new CourierReportsQueryDto();
      const result = await service.getCourierReports('user-id', filters);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
