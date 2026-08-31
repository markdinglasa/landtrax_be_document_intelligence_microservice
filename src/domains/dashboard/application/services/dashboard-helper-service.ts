import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultRoles, USER_TYPE } from 'src/shared/common/app-enums';
import CompanyEntity from 'src/shared/infrastructure/database/entities/company.entity';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import WidgetEntity from 'src/shared/infrastructure/database/entities/widget.entity';
import { In, IsNull, Repository } from 'typeorm';
import { DashboardNamespace, DateRange } from '../../domain/types';

@Injectable()
export class DashboardHelperService {
  constructor(
    @InjectRepository(UserCompanyEntity)
    private readonly userCompanyRepo: Repository<UserCompanyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  safeJsonParse(val: unknown): any {
    if (val === null || val === undefined) return null;
    if (typeof val === 'object') return val;
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return val;
    }
  }

  normalizeWidgetNamespace(dto: Partial<WidgetEntity>, namespace?: DashboardNamespace) {
    if (!namespace) return dto;
    const existingFilter = this.safeJsonParse((dto as any)?.filter);
    const filterObj =
      existingFilter && typeof existingFilter === 'object' && !Array.isArray(existingFilter)
        ? existingFilter
        : {};
    filterObj.namespace = namespace;
    return { ...(dto as any), filter: filterObj };
  }

  widgetMatchesNamespace(widget: WidgetEntity, namespace?: DashboardNamespace): boolean {
    if (!namespace) return true;
    const parsed = this.safeJsonParse(widget.filter);
    const ns =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed.namespace : undefined;
    // Backward compatible: widgets without explicit namespace are shared
    if (!ns) return true;
    return ns === namespace;
  }

  serializeNullable(val: any): any {
    if (val === undefined) return null;
    if (val === null) return null;
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return val;
  }

  getEffectiveRange(range?: DateRange): { from: string; to: string } {
    const dateFrom = range?.from || '1900-01-01';
    let dateTo = range?.to || null;

    if (!dateTo) {
      dateTo = new Date().toISOString().split('T')[0];
    }

    if (dateTo) {
      dateTo = `${dateTo} 23:59:59`;
    }

    return { from: dateFrom, to: dateTo };
  }

  async getCompanyIdForUser(userId: string): Promise<string | null> {
    const link = await this.userCompanyRepo.findOne({
      where: { userId, deletedDate: IsNull() },
      order: { createdDate: 'ASC' },
    });
    return link?.companyId ?? null;
  }
  private async getUsersByCompanyAndType(companyId: string, userType?: string): Promise<string[]> {
    const userCompanies = await this.userCompanyRepo.find({
      where: { companyId, deletedDate: IsNull() },
      select: ['userId'],
    });

    const companyUserIds = userCompanies.map((r) => r.userId).filter(Boolean);

    if (userType && userType.toLowerCase() !== 'all' && companyUserIds.length > 0) {
      const filteredUsers = await this.userRepo.find({
        where: {
          id: In(companyUserIds),
          type: userType as any,
          deletedDate: IsNull(),
        },
        select: ['id'],
      });
      return filteredUsers.map((u) => u.id).filter(Boolean);
    }

    return companyUserIds;
  }

  async resolveUserScope({
    userId,
    companyId,
    isAdmin,
    userType,
  }: {
    userId?: string;
    isAdmin?: boolean;
    companyId?: string;
    userType?: string;
  }): Promise<string[]> {
    if (!userId) return [];

    const user = await this.userRepo.findOne({
      where: { id: userId, deletedDate: IsNull() },
      withDeleted: false,
      relations: ['userCompanies', 'userRoles'],
    });
    if (!user) return [];

    const isLandtraxAdmin = user.type === USER_TYPE.ADMINISTRATOR;
    const isCorpAdmin: boolean =
      user?.userRoles?.some((ur) => {
        return ur?.role?.name === (DefaultRoles.CORPORATE_ADMIN as string);
      }) || false;

    if (isLandtraxAdmin) {
      if (!companyId) {
        const whereCondition: any = { deletedDate: IsNull() };
        if (userType && userType.toLowerCase() !== 'all') {
          whereCondition.type = userType;
        }

        const allUsers = await this.userRepo.find({
          where: whereCondition,
          select: ['id'],
        });

        return allUsers.map((u) => u.id).filter(Boolean);
      }
      return this.getUsersByCompanyAndType(companyId, userType);
    } else if (isCorpAdmin) {
      const corpCompanyId = user.userCompanies?.[0]?.companyId;
      if (!corpCompanyId) return [];
      return this.getUsersByCompanyAndType(corpCompanyId, userType);
    } else {
      // for Individual & Corporate Sub-users
      return [userId];
    }
  }

  async resolveCompanyIdByName(companyName: string): Promise<string | null> {
    if (!companyName) return null;
    const name = companyName.trim();
    const company = await this.userCompanyRepo.manager.findOne(CompanyEntity, {
      where: { name, deletedDate: IsNull() },
    });
    return company?.id ?? null;
  }
}
