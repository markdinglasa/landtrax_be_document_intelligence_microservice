import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import UserCompanyEntity from 'src/shared/infrastructure/database/entities/user-company.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyScopeHelper {
  constructor(
    @InjectRepository(UserCompanyEntity)
    private readonly _userCompanyRepo: Repository<UserCompanyEntity>,
  ) {}

  /**
   * Returns all user IDs that belong to the same companies as the given corporate admin user.
   */
  async getCompanyUserIds(userId: string): Promise<string[]> {
    const userCompanies = await this._userCompanyRepo.find({
      where: { userId },
    });

    if (userCompanies.length === 0) {
      return [];
    }

    const companyIds = userCompanies.map((uc) => uc.companyId);

    const companyUserIds = await this._userCompanyRepo
      .createQueryBuilder('uc')
      .select('uc.userId', 'userId')
      .where('uc.companyId IN (:...companyIds)', { companyIds })
      .getRawMany();

    return companyUserIds.map((row) => row.userId).filter(Boolean);
  }
}
