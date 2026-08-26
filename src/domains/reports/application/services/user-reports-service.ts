import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultRoles } from 'src/assets';
import { CustomMeta } from 'src/shared/common';
import { UserStatus } from 'src/modules/user/types';
import { foramtPhoneNumber, mainRoleTransform } from 'src/utils';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { USER_TYPE } from '../../../common/app-enums';
import AuditTrailEntity from 'src/shared/infrastructure/database/entities/audit-trail-entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import { UserReportsQueryDto } from '../dtos/user-reports-query.dto';
import { UserReportsSummaryQueryDto } from '../dtos/user-reports-summary-query.dto';
import { CompanyScopeHelper } from './shared/company-scope-helper';

@Injectable()
export class UserReportsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
    @InjectRepository(AuditTrailEntity)
    private readonly _auditTrailRepo: Repository<AuditTrailEntity>,
    private readonly _companyScopeHelper: CompanyScopeHelper,
  ) {}

  async getUserReports(
    filters: UserReportsQueryDto,
  ): Promise<{ data: UserEntity[]; meta: CustomMeta }> {
    try {
      const queryBuilder = this.applyBaseUserReportsFilters()
        .leftJoinAndSelect('user.userCompanies', 'userCompanies')
        .leftJoinAndSelect('userCompanies.company', 'company')
        .leftJoinAndSelect('user.userRoles', 'userRoles')
        .leftJoinAndSelect('userRoles.role', 'role');

      this.applySearchAndDateFilters(queryBuilder, filters);
      this.applyRegistrationStatusFilter(queryBuilder, filters);
      this.applyUserReportsFilters(queryBuilder, filters);

      const sortBy = filters.sortBy || 'registrationDate';
      const sortDirection = filters.sortDirection || 'desc';
      const sortFieldMapping = {
        name: 'user.firstName',
        email: 'user.email',
        phoneNumber: 'user.phoneNumber',
        status: 'user.status',
        userType: 'user.type',
        userRole: 'role.name',
        company: 'company.name',
        location: 'rod.Name',
        registrationDate: 'user.createdDate',
        lastLoginDate: 'user.lastLoginDate',
      };

      if (sortBy === 'location') {
        this.ensureRegistryOfDeedJoin(queryBuilder);
      }

      if (sortBy === 'location') {
        this.ensureRegistryOfDeedJoin(queryBuilder);
      }

      const needsInMemorySortBy = sortBy === 'location' || sortBy === 'userRole';
      const dbSortField = needsInMemorySortBy
        ? 'user.id'
        : sortFieldMapping[sortBy as keyof typeof sortFieldMapping] || 'user.createdDate';
      queryBuilder.orderBy(dbSortField, sortDirection.toUpperCase() as 'ASC' | 'DESC');
      queryBuilder.addOrderBy('user.id', 'ASC');

      const total = await queryBuilder.getCount();
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const users = await queryBuilder.getMany();

      // Resolve Registry of Deed (Location) names
      const registryOfDeedIdValues = users
        .map((u) => u.registryOfDeedId)
        .filter(Boolean) as string[];
      let locationMap: Record<string, string> = {};
      if (registryOfDeedIdValues.length > 0) {
        const rodRaw = await this._userRepo.manager
          .createQueryBuilder()
          .select('rod.Id', 'id')
          .addSelect('rod.Name', 'name')
          .from('RegistryOfDeed', 'rod')
          .where('rod.Id IN (:...ids)', { ids: registryOfDeedIdValues })
          .getRawMany();
        locationMap = rodRaw.reduce(
          (acc, row) => {
            acc[row.id] = row.name;
            return acc;
          },
          {} as Record<string, string>,
        );
      }

      const data = users.map((user) => this.transformUserReportItem(user, locationMap));

      if (sortBy === 'location') {
        data.sort((a, b) => {
          const valA = String(a.location || '').toLowerCase();
          const valB = String(b.location || '').toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      }

      if (sortBy === 'userRole') {
        data.sort((a, b) => {
          const valA = String(a.userRole || '').toLowerCase();
          const valB = String(b.userRole || '').toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      }

      const totalPages = Math.ceil(total / limit);

      return { data, meta: { total, page, limit, totalPages } };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error(`Error generating user reports: ${(e as Error).message}`);
      return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
  }

  async getUserReportsSummary(filters: UserReportsSummaryQueryDto, userId?: string): Promise<any> {
    try {
      const queryBuilder = this.applyBaseUserReportsFilters();

      if (userId) {
        const scopedUserIds = await this._companyScopeHelper.getCompanyUserIds(userId);
        if (scopedUserIds.length === 0) {
          return {
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            emailVerifiedCount: 0,
            twoFactorAdoptionRate: 0,
          };
        }
        queryBuilder.andWhere('user.id IN (:...userIds)', { userIds: scopedUserIds });
      }

      this.applySearchAndDateFilters(queryBuilder, filters);
      this.applyRegistrationStatusFilter(queryBuilder, filters);
      this.applyUserReportsFilters(queryBuilder, filters);

      const totalUsers = await queryBuilder.getCount();
      const activeUsers = await queryBuilder.clone().andWhere("user.status = 'ACTIVE'").getCount();
      const inactiveUsers = await queryBuilder
        .clone()
        .andWhere("user.status = 'INACTIVE'")
        .getCount();

      const emailVerifiedCount = await queryBuilder
        .clone()
        .andWhere('user.emailVerifiedDate IS NOT NULL')
        .getCount();

      const twoFactorEnabledCount = await queryBuilder
        .clone()
        .andWhere('(user.twoFactorEnabled = 1 OR user.mfaEnabled = 1)')
        .getCount();

      const twoFactorAdoptionRate =
        totalUsers > 0 ? Math.round((twoFactorEnabledCount / totalUsers) * 100) : 0;

      return { totalUsers, activeUsers, inactiveUsers, emailVerifiedCount, twoFactorAdoptionRate };
    } catch (e) {
      console.error(`Error generating user reports summary: ${(e as Error).message}`);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        emailVerifiedCount: 0,
        twoFactorAdoptionRate: 0,
      };
    }
  }

  async getClientUserReports(
    filters: UserReportsQueryDto,
    userId: string,
  ): Promise<{ data: UserEntity[]; meta: CustomMeta }> {
    try {
      const scopedUserIds = await this._companyScopeHelper.getCompanyUserIds(userId);

      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);

      if (scopedUserIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }

      const queryBuilder = this.applyBaseUserReportsFilters()
        .leftJoinAndSelect('user.userCompanies', 'userCompanies')
        .leftJoinAndSelect('userCompanies.company', 'company')
        .leftJoinAndSelect('user.userRoles', 'userRoles')
        .leftJoinAndSelect('userRoles.role', 'role')
        .andWhere('user.id IN (:...userIds)', { userIds: scopedUserIds });

      this.applySearchAndDateFilters(queryBuilder, filters);
      this.applyRegistrationStatusFilter(queryBuilder, filters);
      this.applyUserReportsFilters(queryBuilder, filters);

      const sortBy = filters.sortBy || 'registrationDate';
      const sortDirection = filters.sortDirection || 'desc';
      const sortFieldMapping = {
        name: 'user.firstName',
        email: 'user.email',
        phoneNumber: 'user.phoneNumber',
        status: 'user.status',
        userType: 'user.type',
        userRole: 'role.name',
        company: 'company.name',
        location: 'rod.Name',
        registrationDate: 'user.createdDate',
        lastLoginDate: 'user.lastLoginDate',
      };

      if (sortBy === 'location') {
        this.ensureRegistryOfDeedJoin(queryBuilder);
      }

      const needsInMemorySortBy = sortBy === 'location' || sortBy === 'userRole';
      const dbSortField = needsInMemorySortBy
        ? 'user.id'
        : sortFieldMapping[sortBy as keyof typeof sortFieldMapping] || 'user.createdDate';
      queryBuilder.orderBy(dbSortField, sortDirection.toUpperCase() as 'ASC' | 'DESC');
      queryBuilder.addOrderBy('user.id', 'ASC');

      const total = await queryBuilder.getCount();
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const users = await queryBuilder.getMany();

      // Resolve Registry of Deed (Location) names
      const registryOfDeedIdValues = users
        .map((u) => u.registryOfDeedId)
        .filter(Boolean) as string[];
      let locationMap: Record<string, string> = {};
      if (registryOfDeedIdValues.length > 0) {
        const rodRaw = await this._userRepo.manager
          .createQueryBuilder()
          .select('rod.Id', 'id')
          .addSelect('rod.Name', 'name')
          .from('RegistryOfDeed', 'rod')
          .where('rod.Id IN (:...ids)', { ids: registryOfDeedIdValues })
          .getRawMany();
        locationMap = rodRaw.reduce(
          (acc, row) => {
            acc[row.id] = row.name;
            return acc;
          },
          {} as Record<string, string>,
        );
      }

      const data = users.map((user) => {
        const type = user?.userRoles?.some((ur) => ur?.role?.name === DefaultRoles.CORPORATE_ADMIN)
          ? DefaultRoles.CORPORATE_ADMIN
          : DefaultRoles.CORPORATE_SUB_USER;
        return {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email,
          phoneNumber: user.phoneNumber,
          status: user.status || 'N/A',
          registeredAt: user.createdDate?.toISOString(),
          approvedAt: user.approvedDate?.toISOString(),
          lastLoginDate: user.lastLoginDate?.toISOString() || '',
          company: user?.userCompanies?.[0]?.company?.name || '',
          userRole: type,
          registryOfDeedId: user.registryOfDeedId,
          location: locationMap?.[user.registryOfDeedId ?? ''] || null,
        };
      }) as unknown as UserEntity[];

      if (sortBy === 'location') {
        data.sort((a, b) => {
          const valA = String(a.location?.name).toLowerCase();
          const valB = String(b.location?.name).toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      }

      if (sortBy === 'userRole') {
        data.sort((a, b) => {
          const valA = String((a as any).userRole || '').toLowerCase();
          const valB = String(b as any).toLowerCase();
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      }

      const totalPages = Math.ceil(total / limit);

      return { data, meta: { total, page, limit, totalPages } };
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error(`Error generating client user reports: ${(e as Error).message}`);
      return { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    }
  }

  applyBaseUserReportsFilters(): SelectQueryBuilder<UserEntity> {
    return this._userRepo
      .createQueryBuilder('user')
      .where("user.deletedDate IS NULL AND user.username <> 'SYSTEM'");
  }
  applyRegistrationStatusFilter(
    queryBuilder: SelectQueryBuilder<UserEntity>,
    filters: UserReportsQueryDto,
  ) {
    const statusVal = filters.status || filters.statuses;
    if (statusVal) {
      const statuses = statusVal
        .split(',')
        .map((status) => status.trim().toUpperCase())
        .map((s) => UserStatus[s as keyof typeof UserStatus] || s);
      queryBuilder.andWhere('user.status IN (:...statuses)', { statuses });
    }

    const regStatusVal = filters.registrationStatus || filters.registrationStatuses;
    if (regStatusVal) {
      const regStatuses = new Set(regStatusVal.split(',').map((status) => status.trim()));
      const conditions: string[] = [];
      if (regStatuses.has('approved')) conditions.push('user.isApproved = 1');
      if (regStatuses.has('pending')) conditions.push('user.isApproved IS NULL');
      if (regStatuses.has('rejected')) conditions.push('user.isApproved = 0');
      if (conditions.length > 0) queryBuilder.andWhere(`(${conditions.join(' OR ')})`);
    }

    return queryBuilder;
  }
  applySearchAndDateFilters(
    queryBuilder: SelectQueryBuilder<UserEntity>,
    filters: UserReportsQueryDto,
  ) {
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

    if (dateFrom) {
      queryBuilder.andWhere('user.createdDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('ISNULL(user.updatedDate, user.createdDate) <= :dateTo', {
        dateTo: new Date(dateTo),
      });
    }
    if (filters.search) {
      this.ensureCompanyJoinForUserReports(queryBuilder);
      this.ensureRoleJoinForUserReports(queryBuilder);
      const search = `%${filters.search.toLowerCase()}%`;

      queryBuilder.andWhere(
        '(' +
          'LOWER(user.firstName) LIKE :search OR ' +
          'LOWER(user.lastName) LIKE :search OR ' +
          "LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE :search OR " +
          'LOWER(user.email) LIKE :search OR ' +
          'user.phoneNumber LIKE :search OR ' +
          'LOWER(user.status) LIKE :search OR ' +
          'LOWER(user.type) LIKE :search OR ' +
          "LOWER(CASE WHEN user.type = 'ADMINISTRATOR' THEN 'LandTrax' WHEN user.type = 'Individual' THEN 'Individual' ELSE 'Corporate' END) LIKE :search OR " +
          'LOWER(company.name) LIKE :search OR ' +
          'LOWER(company.entityCode) LIKE :search OR ' +
          'LOWER(role.name) LIKE :search' +
          ')',
        { search },
      );
    }

    return queryBuilder;
  }
  private applyVerificationStatusFilter(
    queryBuilder: SelectQueryBuilder<UserEntity>,
    filters: UserReportsQueryDto,
  ) {
    if (filters.verificationStatus) {
      const verStatuses = new Set(
        filters.verificationStatus.split(',').map((status) => status.trim()),
      );
      const conditions: string[] = [];
      if (verStatuses.has('email_verified')) conditions.push('user.emailVerifiedDate IS NOT NULL');
      if (verStatuses.has('phone_verified')) conditions.push('user.phoneVerifiedDate IS NOT NULL');
      if (conditions.length > 0) queryBuilder.andWhere(`(${conditions.join(' OR ')})`);
    }
  }

  private applyLocationFilters(
    queryBuilder: SelectQueryBuilder<UserEntity>,
    filters: UserReportsQueryDto,
  ) {
    if (filters.location) {
      const locations = filters.location.split(',').filter(Boolean);
      if (locations.length > 0) {
        this.ensureRegistryOfDeedJoin(queryBuilder);
        queryBuilder.andWhere('rod.Name IN (:...locations)', { locations });
      }
    } else if (filters.registryOfDeedIds) {
      const ids = filters.registryOfDeedIds.split(',').filter(Boolean);
      if (ids.length > 0) {
        queryBuilder.andWhere('user.registryOfDeedId IN (:...registryOfDeedIds)', {
          registryOfDeedIds: ids,
        });
      }
    }
  }

  applyUserReportsFilters(
    queryBuilder: SelectQueryBuilder<UserEntity>,
    filters: UserReportsQueryDto,
  ): void {
    this.applyVerificationStatusFilter(queryBuilder, filters);

    if (filters.entityCode) {
      this.ensureCompanyJoinForUserReports(queryBuilder);
      queryBuilder.andWhere('LOWER(company.entityCode) LIKE :entityCode', {
        entityCode: `%${filters.entityCode.toLowerCase()}%`,
      });
    }

    if (filters.company) {
      this.ensureCompanyJoinForUserReports(queryBuilder);
      queryBuilder.andWhere('company.name LIKE :company', { company: `%${filters.company}%` });
    }

    if (filters.userType) {
      queryBuilder.andWhere('user.type = :userType', { userType: filters.userType });
    }

    this.applyLocationFilters(queryBuilder, filters);
  }

  private ensureCompanyJoinForUserReports(queryBuilder: SelectQueryBuilder<UserEntity>): void {
    const hasUserCompaniesJoin = queryBuilder.expressionMap.joinAttributes.some(
      (j) => j.alias.name === 'userCompanies',
    );
    if (!hasUserCompaniesJoin) queryBuilder.leftJoin('user.userCompanies', 'userCompanies');

    const hasCompanyJoin = queryBuilder.expressionMap.joinAttributes.some(
      (j) => j.alias.name === 'company',
    );
    if (!hasCompanyJoin) queryBuilder.leftJoin('userCompanies.company', 'company');
  }

  private ensureRoleJoinForUserReports(queryBuilder: SelectQueryBuilder<UserEntity>): void {
    const hasUserRolesJoin = queryBuilder.expressionMap.joinAttributes.some(
      (j) => j.alias.name === 'userRoles',
    );
    if (!hasUserRolesJoin) queryBuilder.leftJoin('user.userRoles', 'userRoles');

    const hasRoleJoin = queryBuilder.expressionMap.joinAttributes.some(
      (j) => j.alias.name === 'role',
    );
    if (!hasRoleJoin) queryBuilder.leftJoin('userRoles.role', 'role');
  }

  private ensureRegistryOfDeedJoin(queryBuilder: SelectQueryBuilder<UserEntity>): void {
    const hasRodJoin = queryBuilder.expressionMap.joinAttributes.some(
      (j) => j.alias.name === 'rod',
    );
    if (!hasRodJoin) {
      queryBuilder.leftJoin('RegistryOfDeed', 'rod', 'rod.Id = user.registryOfDeedId');
    }
  }

  private transformUserReportItem(user: UserEntity, locationMap?: Record<string, string>): any {
    const userTypeFormatted = (): string => {
      if (user?.type === USER_TYPE.ADMINISTRATOR) return 'LandTrax';
      if (user?.type === USER_TYPE.INDIVIDUAL) return 'Individual';
      return 'Corporate';
    };

    const roles = user?.userRoles?.map((userRole) => mainRoleTransform(userRole?.role?.name));
    const dededupRoles = [...new Set(roles)].join(',');

    return {
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phoneNumber: foramtPhoneNumber(user.phoneNumber),
      status: user.status || 'N/A',
      registeredAt: user.createdDate?.toISOString(),
      approvedAt: user.approvedDate?.toISOString(),
      lastLoginDate: user.lastLoginDate?.toISOString() || '',
      company: user.userCompanies?.[0]?.company?.name,
      userType: userTypeFormatted(),
      userRole: dededupRoles,
      registryOfDeedId: user.registryOfDeedId,
      location: locationMap?.[user.registryOfDeedId ?? ''] || null,
    };
  }
}
