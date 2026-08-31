import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import { formatToUserDate } from 'src/utils/date-utils';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ServiceCatalogReportItemDto } from '../dtos/service-catalog-report-item.dto';
import { ServiceCatalogReportsQueryDto } from '../dtos/service-catalog-reports-query.dto';
import { ServiceCatalogReportsResponseDto } from '../dtos/service-catalog-reports-response.dto';

@Injectable()
export class ServiceCatalogReportsService {
  private readonly _logger = new Logger(ServiceCatalogReportsService.name);

  constructor(
    @InjectRepository(ServiceEntity)
    private readonly _serviceRepo: Repository<ServiceEntity>,
  ) {}

  async getServiceCatalogReports(
    filters: ServiceCatalogReportsQueryDto,
  ): Promise<ServiceCatalogReportsResponseDto> {
    try {
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 10);
      const offset = (page - 1) * limit;

      let queryBuilder = this._serviceRepo
        .createQueryBuilder('service')
        .leftJoinAndSelect('service.category', 'category')
        .where('service.deletedDate IS NULL');

      queryBuilder = this.applyFilters(queryBuilder, filters);
      queryBuilder = this.applyDateRangeFilters(queryBuilder, filters);

      queryBuilder.addSelect(
        'COALESCE(service.updatedDate, service.createdDate)',
        'lastModifiedDate',
      );

      const sortBy = filters.sortBy || 'lastModified';
      const sortDirection = filters.sortDirection || 'desc';

      const sortMapping: Record<string, string> = {
        createdDate: 'service.createdDate',
        lastModified: 'lastModifiedDate',
        service: 'service.name',
        serviceCode: 'service.serviceCode',
        category: 'category.name',
        price: 'service.price',
        turnaroundDays: 'service.turnaroundDays',
        isActive: 'service.isActive',
      };
      const dbColumn = sortMapping[sortBy] || 'lastModifiedDate';
      queryBuilder.orderBy(dbColumn, sortDirection.toUpperCase() as 'ASC' | 'DESC');

      queryBuilder.skip(offset).take(limit);
      const [entities, total] = await queryBuilder.getManyAndCount();

      const data = entities.map((entity) => this.transformItem(entity));

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: unknown) {
      this._logger.error(
        `Error generating service catalog reports: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }

  private applyDateRangeFilters(
    queryBuilder: SelectQueryBuilder<ServiceEntity>,
    filters: ServiceCatalogReportsQueryDto,
  ): SelectQueryBuilder<ServiceEntity> {
    const dateFrom = filters.dateFrom || null;
    let dateTo = filters.dateTo || null;

    if (dateFrom && !dateTo) {
      dateTo = new Date().toISOString().split('T')[0];
    }

    if (dateTo) {
      const dateString = dateTo.includes('T') ? dateTo.split('T')[0] : dateTo;
      dateTo = `${dateString}T23:59:59.999Z`;
    }

    if (dateFrom && dateTo) {
      if (new Date(dateFrom) > new Date(dateTo)) {
        throw new BadRequestException('Start date cannot be after end date');
      }
    }

    if (dateFrom || dateTo) {
      if (dateFrom) {
        queryBuilder.andWhere('ISNULL(service.updatedDate, service.createdDate) >= :dateFrom', {
          dateFrom,
        });
      }
      if (dateTo) {
        queryBuilder.andWhere('ISNULL(service.updatedDate, service.createdDate) <= :dateTo', {
          dateTo: new Date(dateTo),
        });
      }
    }
    return queryBuilder;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<ServiceEntity>,
    filters: ServiceCatalogReportsQueryDto,
  ): SelectQueryBuilder<ServiceEntity> {
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      queryBuilder.andWhere(
        '(service.name LIKE :term OR service.serviceCode LIKE :term OR service.description LIKE :term OR category.name LIKE :term OR service.type LIKE :term)',
        { term },
      );
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('service.price >= :minPrice', {
        minPrice: Number.parseInt(`${filters.minPrice}`, 10),
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('service.price <= :maxPrice', {
        maxPrice: Number.parseInt(`${filters.maxPrice}`, 10),
      });
    }

    if (filters.minTurnaround !== undefined) {
      queryBuilder.andWhere('service.turnaroundDays >= :minTurnaroundDays', {
        minTurnaroundDays: filters.minTurnaround,
      });
    }

    if (filters.maxTurnaround !== undefined) {
      queryBuilder.andWhere('service.turnaroundDays <= :maxTurnaroundDays', {
        maxTurnaroundDays: filters.maxTurnaround,
      });
    }

    if (filters.status !== undefined && filters.status !== 'all' && filters.status !== '') {
      const isActiveValue = filters.status === 'true' || filters.status === '1';
      queryBuilder.andWhere('service.isActive = :isActive', { isActive: isActiveValue ? 1 : 0 });
    }

    if (filters.category && filters.category.trim() !== 'all') {
      queryBuilder.andWhere('category.name = :category AND service.type = :category', {
        category: filters.category,
      });
    }
    return queryBuilder;
  }

  private transformItem(entity: ServiceEntity): ServiceCatalogReportItemDto {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      description: entity.description,
      category: entity.category,
      serviceCode: entity.serviceCode,
      price: Number(entity.price),
      turnaroundDays: entity.turnaroundDays,
      isActive: Boolean(entity.isActive),
      createdDate: formatToUserDate(entity.createdDate),
      lastModified: formatToUserDate(entity.updatedDate || entity.createdDate),
    };
  }
}
