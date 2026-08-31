import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import EntityCodeEntity from 'src/shared/infrastructure/database/entities/entity-code.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { normalizeDateToFilter } from '../../../utils/date-utils';
import { EntityCodeReportItemDto } from '../dtos/entity-code-report-item.dto';
import { EntityCodeReportsQueryDto } from '../dtos/entity-code-reports-query.dto';
import { EntityCodeReportsResponseDto } from '../dtos/entity-code-reports-response.dto';

@Injectable()
export class EntityCodeReportsService {
  private readonly _logger = new Logger(EntityCodeReportsService.name);

  constructor(
    @InjectRepository(EntityCodeEntity)
    private readonly _entityCodeRepo: Repository<EntityCodeEntity>,
  ) {}

  async getEntityCodeReports(
    filters: EntityCodeReportsQueryDto,
  ): Promise<EntityCodeReportsResponseDto> {
    try {
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 10);
      const offset = (page - 1) * limit;

      let queryBuilder = this._entityCodeRepo
        .createQueryBuilder('entityCode')
        .leftJoinAndSelect('entityCode.proposalReferences', 'proposalReferences')
        .leftJoinAndSelect('entityCode.createdByUser', 'createdByUser')
        .leftJoinAndSelect('entityCode.company', 'company')
        .leftJoinAndSelect('entityCode.accountOwner', 'accountOwner')
        .where('entityCode.deletedDate IS NULL');

      queryBuilder = this.applyEntityCodeReportsFilters(queryBuilder, filters);

      const sortBy = filters.sortBy || 'createdDate';
      const sortDirection = filters.sortDirection || 'desc';
      const sortMapping = {
        createdDate: 'entityCode.createdDate',
        generatedBy: 'createdByUser.firstName',
        code: 'entityCode.code',
        companyName: 'company.name',
        status: 'entityCode.status',
      };
      const dbColumn = sortMapping[sortBy] || 'entityCode.createdDate';
      queryBuilder.orderBy(dbColumn, sortDirection.toUpperCase() as 'ASC' | 'DESC');

      queryBuilder.skip(offset).take(limit);
      const [entities, total] = await queryBuilder.getManyAndCount();

      const data = entities.map((entity) => this.transformEntityCodeReportItem(entity));

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
        `Error generating entity code reports: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }
  }

  private applyEntityCodeReportsFilters(
    queryBuilder: SelectQueryBuilder<EntityCodeEntity>,
    filters: EntityCodeReportsQueryDto,
  ): SelectQueryBuilder<EntityCodeEntity> {
    if (filters.dateFrom) {
      queryBuilder.andWhere('entityCode.createdDate >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      const dateTo = normalizeDateToFilter(filters.dateTo);
      queryBuilder.andWhere('entityCode.createdDate <= :dateTo', { dateTo });
    }

    if (filters.status && filters.status.trim() !== 'all') {
      queryBuilder.andWhere('entityCode.status = :status', { status: filters.status });
    }

    if (filters.accountOwnerId) {
      queryBuilder.andWhere('entityCode.accountOwnerId = :accountOwnerId', {
        accountOwnerId: filters.accountOwnerId,
      });
    }

    if (filters.entityCode) {
      queryBuilder.andWhere('entityCode.code LIKE :entityCode', {
        entityCode: `%${filters.entityCode}%`,
      });
    }

    if (filters.proposalRefNo) {
      queryBuilder.andWhere('proposalReferences.referenceNumber = :proposalRefNo', {
        proposalRefNo: filters.proposalRefNo,
      });
    }

    if (filters.company && filters.company.trim() !== 'all') {
      queryBuilder.andWhere('company.id = :company', { company: filters.company });
    }

    if (filters.generatedBy && filters.generatedBy.trim() !== 'all') {
      const term = `%${filters.generatedBy.trim()}%`;
      queryBuilder.andWhere(
        "CONCAT(createdByUser.firstName, ' ', createdByUser.lastName) LIKE :term",
        { term },
      );
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      queryBuilder.andWhere(
        '(entityCode.code LIKE :term OR createdByUser.firstName LIKE :term OR createdByUser.lastName LIKE :term OR createdByUser.email = :term OR accountOwner.firstName LIKE :term OR accountOwner.lastName LIKE :term OR accountOwner.email = :term OR company.name LIKE :term OR proposalReferences.referenceNumber LIKE :term)',
        { term },
      );
    }

    return queryBuilder;
  }

  private transformEntityCodeReportItem(entity: EntityCodeEntity): EntityCodeReportItemDto {
    return {
      id: entity.id,
      company: entity.company?.name || 'N/A',
      companyEmail: entity?.company?.email || 'N/A',
      entityCode: entity.code,
      accountOwner: entity.accountOwner
        ? `${entity.accountOwner.firstName} ${entity.accountOwner.lastName}`
        : 'N/A',
      accountOwnerEmail: entity?.accountOwner?.email || '',
      proposalReferences:
        entity.proposalReferences?.map((pr) => pr.referenceNumber).join(', ') || '',
      status: entity.status,
      generatedBy: entity.createdByUser
        ? `${entity.createdByUser.firstName} ${entity.createdByUser.lastName}`
        : 'N/A',
      generatedDate: entity.createdDate.toISOString(),
    };
  }
}
