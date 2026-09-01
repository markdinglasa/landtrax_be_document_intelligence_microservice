import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code.entity';
import { EntityCodeReportsService } from '../entity-code-reports.service';

describe('EntityCodeReportsService', () => {
  let service: EntityCodeReportsService;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: '1',
            company: { name: 'Test Company', email: 'test@company.com' },
            code: 'CODE1',
            accountOwner: { firstName: 'John', lastName: 'Doe', email: 'owner@test.com' },
            proposalReferences: [{ referenceNumber: 'PR-1' }],
            status: 'ACTIVE',
            createdByUser: { firstName: 'Jane', lastName: 'Smith' },
            createdDate: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        1,
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityCodeReportsService,
        {
          provide: getRepositoryToken(EntityCodeEntity),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<EntityCodeReportsService>(EntityCodeReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEntityCodeReports', () => {
    it('should return reports without filters', async () => {
      const result = await service.getEntityCodeReports({});

      expect(result.meta.total).toBe(1);
      expect(result.data.length).toHaveLength(1);
      expect(result.data[0].entityCode).toBe('CODE1');
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      await service.getEntityCodeReports({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        status: 'ACTIVE',
        accountOwnerId: 'owner-id',
        entityCode: 'CODE',
        proposalRefNo: 'PR-1',
        company: 'company-id',
        generatedBy: 'Jane',
        search: 'keyword',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entityCode.createdDate >= :dateFrom',
        expect.any(Object),
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entityCode.createdDate <= :dateTo',
        expect.any(Object),
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('entityCode.status = :status', {
        status: 'ACTIVE',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entityCode.accountOwnerId = :accountOwnerId',
        { accountOwnerId: 'owner-id' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('entityCode.code LIKE :entityCode', {
        entityCode: '%CODE%',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'proposalReferences.referenceNumber = :proposalRefNo',
        { proposalRefNo: 'PR-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('company.id = :company', {
        company: 'company-id',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "CONCAT(createdByUser.firstName, ' ', createdByUser.lastName) LIKE :term",
        { term: '%Jane%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('entityCode.code LIKE :term OR createdByUser.firstName LIKE :term'),
        { term: '%keyword%' },
      );
    });

    it('should handle sorting', async () => {
      await service.getEntityCodeReports({
        sortBy: 'companyName',
        sortDirection: 'asc',
      });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('company.name', 'ASC');
    });

    it('should handle pagination', async () => {
      await service.getEntityCodeReports({
        page: 2,
        limit: 20,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should catch errors and return empty response', async () => {
      queryBuilder.getManyAndCount.mockRejectedValueOnce(new Error('DB Error'));

      const result = await service.getEntityCodeReports({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
