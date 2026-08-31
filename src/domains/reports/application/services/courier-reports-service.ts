import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomMeta, USER_TYPE } from 'src/shared/common';
import LandtraxAddressEntity from 'src/shared/infrastructure/database/entities/landtrax-address.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { CourierReportItemDto } from '../dtos/courier-report-item.dto';
import { CourierReportsQueryDto } from '../dtos/courier-reports-query.dto';

@Injectable()
export class CourierReportsService {
  private readonly _logger = new Logger(CourierReportsService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
    @InjectRepository(TransactionServiceEntity)
    private readonly _transactionServiceRepo: Repository<TransactionServiceEntity>,
  ) {}

  private applyUserAccessFilter(
    queryBuilder: SelectQueryBuilder<TransactionServiceEntity>,
    user: UserEntity
  ) {
    if (user.type === USER_TYPE.CORPORATE && user.mainRole === 'Corporate Admin') {
      const userCompanyIds = user.userCompanies?.map((uc) => uc.companyId) || [];
      if (userCompanyIds.length > 0) {
        queryBuilder.andWhere(
          new Brackets((qb) => {
            qb.andWhere('user.id = :userId', { userId: user.id });
            qb.orWhere('userCompanies.companyId IN (:...userCompanyIds)', { userCompanyIds });
          }),
        );
      } else {
        queryBuilder.andWhere('user.id = :userId', { userId: user.id });
      }
    } else {
      queryBuilder.andWhere('user.id = :userId', { userId: user.id });
    }
  }

  private applyDateFilters(
    queryBuilder: SelectQueryBuilder<TransactionServiceEntity>,
    filters: CourierReportsQueryDto
  ) {
    if (filters.dateFrom && filters.dateTo) {
      queryBuilder.andWhere('transaction.createdDate BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo),
      });
    } else if (filters.dateFrom) {
      queryBuilder.andWhere('transaction.createdDate >= :dateFrom', {
        dateFrom: new Date(filters.dateFrom),
      });
    } else if (filters.dateTo) {
      queryBuilder.andWhere('transaction.createdDate <= :dateTo', {
        dateTo: new Date(filters.dateTo),
      });
    }
  }

  private mapCourierData(transactionServices: any[]): CourierReportItemDto[] {
    return transactionServices.map((transactionService) => {
      const hq = (transactionService as unknown as { landtraxAddress: LandtraxAddressEntity })
        .landtraxAddress;

      return {
        transactionNumber: transactionService?.transaction?.transactionNumber || '',
        transactionServiceNumber: transactionService?.transactionServiceNumber || '',
        trackingNumber: transactionService?.trackingNumber || '',
        courierProvider: transactionService?.courier?.name || '',
        deliveryMethod: transactionService?.transaction?.deliveryMethod?.replaceAll('-', ' '),
        deliveryAddress:
          transactionService?.transaction?.deliveryMethod === 'for-pick-up' && hq
            ? `${hq.name}, ${hq.streetAddress}, ${hq.city}, ${hq.province}, ${hq.country}, (${hq.postalCode})`
            : transactionService?.transaction?.deliveryAddress?.replace('-', '')?.trim() || '',
        status: transactionService?.stagingStatus?.name,
        location: transactionService?.transaction?.location?.name || '',
        recipient: transactionService?.transaction?.recipients?.at(0)?.name,
      } as unknown as CourierReportItemDto;
    });
  }

  async getCourierReports(
    userId: string,
    filters: CourierReportsQueryDto,
  ): Promise<{ data: CourierReportItemDto[]; meta: CustomMeta }> {
    const user = await this._userRepo.findOne({ where: { id: userId, deletedDate: IsNull() } });
    if (!user) throw new NotFoundException('User not found');

    try {
      const deliveryStatuses = [
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'FOR_PICK_UP',
        'PICKED_UP_BY_CLIENT',
        'READY_FOR_RELEASE',
      ];
      let queryBuilder = this._transactionServiceRepo
        .createQueryBuilder('transactionServices')
        .leftJoinAndSelect(
          'transactionServices.transaction',
          'transaction',
          'transaction.deletedDate IS NULL',
        )
        .leftJoinAndMapOne(
          'transactionServices.landtraxAddress',
          LandtraxAddressEntity,
          'landtraxAddress',
          'landtraxAddress.deletedDate IS NULL AND landtraxAddress.isActive = 1',
        )
        .leftJoinAndSelect('transaction.staging', 'staging', 'staging.deletedDate IS NULL')
        .leftJoinAndSelect(
          'transactionServices.stagingStatus',
          'status',
          'status.deletedDate IS NULL',
        )
        .leftJoinAndSelect(
          'transactionServices.courier',
          'courierProvider',
          'courierProvider.deletedDate IS NULL',
        )
        .leftJoinAndSelect('transaction.location', 'location', 'location.deletedDate IS NULL')
        .leftJoinAndSelect('transaction.user', 'user', 'user.deletedDate IS NULL')
        .leftJoinAndSelect(
          'user.userCompanies',
          'userCompanies',
          'userCompanies.deletedDate IS NULL',
        )
        .leftJoinAndSelect('userCompanies.company', 'company', 'company.deletedDate IS NULL')
        .leftJoinAndSelect('transaction.recipients', 'recipients', 'recipients.deletedDate IS NULL')
        .where('transaction.deletedDate IS NULL')
        .andWhere('status.code IN (:...codes)', { codes: deliveryStatuses });

      this.applyUserAccessFilter(queryBuilder, user);
      this.applyDateFilters(queryBuilder, filters);
      queryBuilder = this.applyStatusilter(queryBuilder, filters);
      queryBuilder = this.applySearchFilter(queryBuilder, filters);
      queryBuilder = this.applySorting(queryBuilder, filters);

      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 10);
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);

      const [transactionServices, total] = await queryBuilder.getManyAndCount();

      const data = this.mapCourierData(transactionServices);

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          totalPages,
          page,
          total,
          limit,
        },
      };
    } catch (e) {
      this._logger.error(`Error generating courier reports: ${(e as Error).message}`);
      return {
        data: [],
        meta: {
          totalPages: 0,
          page: 0,
          total: 0,
          limit: 0,
        },
      };
    }
  }
  private applyStatusilter(
    queryBuilder: SelectQueryBuilder<TransactionServiceEntity>,
    filters: CourierReportsQueryDto,
  ): SelectQueryBuilder<TransactionServiceEntity> {
    const status = filters?.status === 'all' ? undefined : filters.status;
    if (status) {
      const statusArray = Array.isArray(status) ? status : status?.split(',').map((s) => s.trim());
      queryBuilder.andWhere('status.code IN (:...status)', { status: statusArray });
    }

    if (filters.courierProvider) {
      queryBuilder.andWhere('courierProvider.name = :provider', {
        provider: filters.courierProvider,
      });
    }

    return queryBuilder;
  }
  private applySearchFilter(
    queryBuilder: SelectQueryBuilder<TransactionServiceEntity>,
    filters: CourierReportsQueryDto,
  ): SelectQueryBuilder<TransactionServiceEntity> {
    if (filters.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('transaction.transactionNumber LIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('transactionServices.transactionServiceNumber LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('transactionServices.trackingNumber LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('courierProvider.name LIKE :search', { search: `%${filters.search}%` })
            .orWhere('transaction.deliveryAddress LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere("REPLACE(transaction.deliveryMethod, '-', ' ') LIKE :search", {
              search: `%${filters.search}%`,
            })
            .orWhere('status.code LIKE :search', { search: `%${filters.search}%` })
            .orWhere('location.name LIKE :search', { search: `%${filters.search}%` })
            .orWhere('recipients.name LIKE :search', { search: `%${filters.search}%` })
            .orWhere('landtraxAddress.name LIKE :search', { search: `%${filters.search}%` })
            .orWhere('landtraxAddress.city LIKE :search', { search: `%${filters.search}%` })
            .orWhere('landtraxAddress.streetAddress LIKE :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }
    return queryBuilder;
  }
  private applySorting(
    queryBuilder: SelectQueryBuilder<TransactionServiceEntity>,
    filters: CourierReportsQueryDto,
  ): SelectQueryBuilder<TransactionServiceEntity> {
    const sortBy = filters.sortBy || 'createdAt';
    const sortDirection = filters.sortDirection || 'desc';

    const sortMapping: Record<string, string> = {
      createdAt: 'transaction.createdDate',
      status: 'status.code',
      transactionNumber: 'transaction.transactionNumber',
      transactionServiceNumber: 'transactionServices.transactionServiceNumber',
      provider: 'courierProvider.name',
      courierProvider: 'courierProvider.name',
      deliveryAddress: 'transaction.deliveryAddress',
      deliveryMethod: 'transaction.deliveryMethod',
      location: 'location.name',
      region: 'location.name',
      recipientName: 'recipients.name',
      trackingNumber: 'transactionServices.trackingNumber',
    };

    const dbColumn = sortMapping[sortBy] || 'transaction.createdDate';
    queryBuilder.orderBy(dbColumn, sortDirection.toUpperCase() as 'ASC' | 'DESC');
    return queryBuilder;
  }
}
