import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import { ServiceCatalogReportsService } from '../service-catalog-reports.service';

describe('ServiceCatalogReportsService', () => {
  let service: ServiceCatalogReportsService;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: '1',
            name: 'Test Service',
            type: 'Test Type',
            description: 'Test Description',
            category: { name: 'Test Category' },
            serviceCode: 'TEST',
            price: 100,
            turnaroundDays: 5,
            isActive: true,
            createdDate: new Date('2026-01-01T00:00:00.000Z'),
            updatedDate: new Date('2026-01-02T00:00:00.000Z'),
          },
        ],
        1,
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceCatalogReportsService,
        {
          provide: getRepositoryToken(ServiceEntity),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<ServiceCatalogReportsService>(ServiceCatalogReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getServiceCatalogReports', () => {
    it('should return reports without filters', async () => {
      const result = await service.getServiceCatalogReports({});

      expect(result.meta.total).toBe(1);
      expect(result.data.length).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Service');
    });

    it('should apply filters correctly', async () => {
      await service.getServiceCatalogReports({
        search: 'keyword',
        minPrice: 50,
        maxPrice: 150,
        minTurnaround: 2,
        maxTurnaround: 10,
        status: 'true',
        category: 'Test Category',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('service.name LIKE :term'),
        { term: '%keyword%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('service.price >= :minPrice', {
        minPrice: 50,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('service.price <= :maxPrice', {
        maxPrice: 150,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'service.turnaroundDays >= :minTurnaroundDays',
        { minTurnaroundDays: 2 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'service.turnaroundDays <= :maxTurnaroundDays',
        { maxTurnaroundDays: 10 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('service.isActive = :isActive', {
        isActive: 1,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.name = :category AND service.type = :category',
        { category: 'Test Category' },
      );
    });

    it('should handle date filters properly', async () => {
      await service.getServiceCatalogReports({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'ISNULL(service.updatedDate, service.createdDate) >= :dateFrom',
        { dateFrom: '2026-01-01' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'ISNULL(service.updatedDate, service.createdDate) <= :dateTo',
        expect.any(Object),
      );
    });

    it('should assign a dateTo if dateFrom is provided without dateTo', async () => {
      await service.getServiceCatalogReports({
        dateFrom: '2026-01-01',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'ISNULL(service.updatedDate, service.createdDate) >= :dateFrom',
        { dateFrom: '2026-01-01' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'ISNULL(service.updatedDate, service.createdDate) <= :dateTo',
        expect.any(Object),
      );
    });

    it('should catch database errors and return empty response', async () => {
      queryBuilder.getManyAndCount.mockRejectedValueOnce(new Error('DB Error'));

      const result = await service.getServiceCatalogReports({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should catch BadRequestException when start date is after end date', async () => {
      const result = await service.getServiceCatalogReports({
        dateFrom: '2026-12-31',
        dateTo: '2026-01-01',
      });

      // Should return the default error response because of the catch block in the service
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle sorting properly', async () => {
      await service.getServiceCatalogReports({
        sortBy: 'service',
        sortDirection: 'asc',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('service.name', 'ASC');
    });
  });
});
