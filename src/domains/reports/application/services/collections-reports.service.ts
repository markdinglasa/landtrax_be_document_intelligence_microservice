import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomMeta } from 'src/shared/common';
import { CollectionStatus, USER_TYPE } from 'src/shared/common/app-enums';
import CollectionMethodEntity from 'src/shared/infrastructure/database/entities/collection-method.entity';
import CollectionEntity from 'src/shared/infrastructure/database/entities/collection.entity';
import ServiceEntity from 'src/shared/infrastructure/database/entities/service-catalog.entity';
import TransactionServiceEntity from 'src/shared/infrastructure/database/entities/transaction-service.entity';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import UserEntity from 'src/shared/infrastructure/database/entities/user.entity';
import S3StorageService from 'src/shared/infrastructure/storage/s3-storage-service';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { FileUtils } from '../../infrastructure/utils/file-utils';
import { CollectionsReportsExportQueryDto } from '../dtos/collections-reports-export-query.dto';
import { CollectionsReportsExportResponseDto } from '../dtos/collections-reports-export-response.dto';
import { CollectionsReportsQueryDto } from '../dtos/collections-reports-query.dto';

@Injectable()
export class CollectionsReportsService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly _transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
    private readonly _storageService: S3StorageService,
  ) {}

  private applyDateFilters(
    query: SelectQueryBuilder<TransactionEntity>,
    filters: CollectionsReportsQueryDto,
  ) {
    if (filters.dateFrom && filters.dateTo) {
      if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
        throw new BadRequestException('Start date cannot be after end date');
      }
    }

    if (filters.dateFrom) {
      query.andWhere('ISNULL(t.updatedDate, t.createdDate) >= :dateFrom', {
        dateFrom: new Date(filters.dateFrom),
      });
    }

    if (filters.dateTo) {
      let dateTo = filters.dateTo;
      if (!dateTo.includes(':')) {
        dateTo = `${dateTo} 23:59:59`;
      }
      query.andWhere('ISNULL(t.updatedDate, t.createdDate) <= :dateTo', {
        dateTo: new Date(dateTo),
      });
    }
  }

  private applyMiscFilters(
    query: SelectQueryBuilder<TransactionEntity>,
    filters: CollectionsReportsQueryDto,
  ) {
    if (filters.company) {
      query.andWhere('c.name LIKE :company', { company: `%${filters.company}%` });
    }

    if (filters.userType) {
      query.andWhere('u.type = :userType', { userType: filters.userType });
    }

    if (filters.location) {
      const locations = filters.location.split(',').filter(Boolean);
      if (locations.length > 0) {
        query.andWhere(
          't.RegistryOfDeedId IN (SELECT rodSub.Id FROM RegistryOfDeed rodSub WHERE rodSub.Name IN (:...locations))',
          { locations },
        );
      }
    }
  }

  private buildBaseQuery(
    filters: CollectionsReportsQueryDto,
  ): SelectQueryBuilder<TransactionEntity> {
    const status = filters?.statuses === 'all' ? null : filters.statuses;
    const query = this._transactionRepo
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u', 'u.deletedDate IS NULL') // Client
      .leftJoin('t.createdByUser', 'crb', 'crb.deletedDate IS NULL') // Lodge by
      .leftJoin('u.userCompanies', 'uc', 'uc.deletedDate IS NULL')
      .leftJoin('uc.company', 'c', 'c.deletedDate IS NULL')
      .leftJoin('t.staging', 's')
      .leftJoin(
        (subQuery) => {
          return subQuery
            .select('tsSub.transactionId', 'id')
            .addSelect('SUM(sSub.price)', 'totalAmountDue')
            .from(TransactionServiceEntity, 'tsSub')
            .innerJoin(
              ServiceEntity,
              'sSub',
              'sSub.id = tsSub.serviceId AND sSub.deletedDate IS NULL',
            )
            .where('tsSub.deletedDate IS NULL AND ISNULL(tsSub.isEOS,0) = 0')
            .groupBy('tsSub.transactionId');
        },
        'tsTotals',
        'tsTotals.id = t.id',
      )
      .leftJoin(
        (subQuery) => {
          return subQuery
            .select('cSub.transactionId', 'id')
            .addSelect('SUM(cmSub.amount)', 'amountPaid')
            .from(CollectionEntity, 'cSub')
            .innerJoin(
              CollectionMethodEntity,
              'cmSub',
              'cmSub.collectionId = cSub.id AND cmSub.deletedDate IS NULL',
            )
            .where('cSub.deletedDate IS NULL')
            .groupBy('cSub.transactionId');
        },
        'cmTotals',
        'cmTotals.id = t.id',
      )
      .where('t.deletedDate IS NULL')
      .andWhere('t.deletedBy IS NULL');

    // Exclude drafts and EOS approval stages
    query.andWhere('s.code <> :draftCode', { draftCode: 'DRAFT' });
    query.andWhere('s.code <> :eosApproval', { eosApproval: 'FOR_EOS_APPROVAL' });

    if (status) {
      const statusArray = Array.isArray(status) ? status : status.split(',').map((s) => s.trim());
      query.andWhere(
        `ISNULL(t.paymentStatus, '${CollectionStatus.PENDING}') IN (:...collectionStatuses)`,
        {
          collectionStatuses: statusArray,
        },
      );
    }

    this.applyDateFilters(query, filters);
    this.applyMiscFilters(query, filters);

    return query;
  }

  async getCollectionsReports(
    filters: CollectionsReportsQueryDto,
    userId: string,
  ): Promise<{ data: any[]; meta: CustomMeta }> {
    try {
      const query = this.buildBaseQuery(filters);

      const user = await this._userRepo.findOne({
        where: { id: userId, deletedDate: IsNull() },
        withDeleted: false,
        relations: ['userCompanies', 'userRoles'],
      });
      if (!user) throw new NotFoundException('User not found');

      const userCompanyIds = user.userCompanies?.map((uc) => uc.companyId) || [];
      const isCorpAdmin: boolean =
        user?.userRoles?.some((ur) => {
          return ur?.role?.name === ('Corporate Admin' as string);
        }) || false;

      if (user.type !== USER_TYPE.ADMINISTRATOR) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('t.userId = :userId', { userId });
            if (userCompanyIds.length > 0 && isCorpAdmin) {
              qb.orWhere('c.id IN (:...userCompanyIds)', { userCompanyIds });
            }
          }),
        );
      }

      if (filters.search) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('c.name LIKE :search', { search: `%${filters.search}%` })
              .orWhere('t.transactionNumber LIKE :search', { search: `%${filters.search}%` })
              .orWhere('t.updatedDate LIKE :search', { search: `%${filters.search}%` })
              .orWhere('t.createdDate LIKE :search', { search: `%${filters.search}%` })
              .orWhere('u.firstName LIKE :search', { search: `%${filters.search}%` })
              .orWhere('u.lastName LIKE :search', { search: `%${filters.search}%` })
              .orWhere('tsTotals.totalAmountDue LIKE :search', { search: `%${filters.search}%` })
              .orWhere('cmTotals.amountPaid LIKE :search', { search: `%${filters.search}%` })
              .orWhere('t.proposalReferenceNumber LIKE :search', { search: `%${filters.search}%` })
              .orWhere('c.entityCode LIKE :search', { search: `%${filters.search}%` })
              .orWhere('t.paymentStatus LIKE :search', { search: `%${filters.search}%` })
              .orWhere(
                't.RegistryOfDeedId IN (SELECT rod_search.Id FROM RegistryOfDeed rod_search WHERE rod_search.Name LIKE :search)',
                { search: `%${filters.search}%` },
              );
          }),
        );
      }

      // Count total
      const totalCountRaw = await query.select('COUNT(DISTINCT t.id)', 'total').getRawOne();
      const totalCount = Number(totalCountRaw?.total || 0);

      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);
      const skip = (page - 1) * limit;

      // Sorting
      const sortBy = filters.sortBy || 'lastModified';
      const sortDirection = (filters.sortDirection || 'desc').toUpperCase() as 'ASC' | 'DESC';
      const sortMapping = {
        lastModified: 'ISNULL(t.updatedDate, t.createdDate)',
        createdAt: 't.createdDate',
        createdDate: 't.createdDate',
        amount: 'totalAmountDue',
        totalAmountDue: 'totalAmountDue',
        amountPaid: 'amountPaid',
        outstandingBalance: 'outstandingBalance',
        status: "ISNULL(t.paymentStatus, 'Pending')",
        paymentStatus: "ISNULL(t.paymentStatus, 'Pending')",
        transactionNumber: 't.transactionNumber',
        company: 'c.name',
        requestor: 'requestor',
        location:
          '(SELECT rod_sort.Name FROM RegistryOfDeed rod_sort WHERE rod_sort.Id = t.RegistryOfDeedId)',
      };
      const dbColumn = sortMapping[sortBy] || sortMapping.lastModified;

      // Data query
      const dataRaw = await query
        .select([
          't.id AS id',
          'c.name AS companyName',
          't.transactionNumber AS transactionNumber',
          't.proposalReferenceNumber AS proposalReferenceNumber',
          "CONCAT(u.firstName, ' ', u.lastName) AS requestor",
          'c.entityCode AS entityCode',
          '(ISNULL(tsTotals.totalAmountDue, 0) * 0.12) + ISNULL(tsTotals.totalAmountDue, 0) AS totalAmountDue', // add VAT as 0.12
          'ISNULL(cmTotals.amountPaid, 0) AS amountPaid',
          '((ISNULL(tsTotals.totalAmountDue, 0) * 0.12) + ISNULL(tsTotals.totalAmountDue, 0)) - ISNULL(cmTotals.amountPaid, 0) AS outstandingBalance',
          `CASE WHEN t.paymentStatus IS NULL THEN '${CollectionStatus.PENDING}' ELSE t.paymentStatus END AS paymentStatus`,
          'ISNULL(t.updatedDate, t.createdDate) AS lastModified',
          't.createdDate AS createdDate',
          't.RegistryOfDeedId AS registryOfDeedId',
        ])
        .groupBy('t.id')
        .addGroupBy('c.name')
        .addGroupBy('t.transactionNumber')
        .addGroupBy('t.updatedDate')
        .addGroupBy('t.createdDate')
        .addGroupBy('u.firstName')
        .addGroupBy('u.lastName')
        .addGroupBy('tsTotals.totalAmountDue')
        .addGroupBy('cmTotals.amountPaid')
        .addGroupBy('t.proposalReferenceNumber')
        .addGroupBy('c.entityCode')
        .addGroupBy('t.paymentStatus')
        .addGroupBy('t.RegistryOfDeedId')
        .orderBy(dbColumn, sortDirection)
        .addOrderBy('t.id', sortDirection) // secondary tie‑breaker
        .offset(skip)
        .limit(limit)
        .getRawMany();

      const totalPages = Math.ceil(totalCount / limit);

      // Resolve Registry of Deed names for Location column
      const registryOfDeedIds = dataRaw
        .map((row: any) => row.registryOfDeedId)
        .filter(Boolean) as string[];
      let locationMap: Record<string, string> = {};
      if (registryOfDeedIds.length > 0) {
        const rodRaw = await this._transactionRepo.manager
          .createQueryBuilder()
          .select('rod.Id', 'id')
          .addSelect('rod.Name', 'name')
          .from('RegistryOfDeed', 'rod')
          .where('rod.Id IN (:...ids)', { ids: registryOfDeedIds })
          .getRawMany();
        locationMap = rodRaw.reduce(
          (acc, row) => {
            acc[row.id] = row.name;
            return acc;
          },
          {} as Record<string, string>,
        );
      }

      return {
        data: dataRaw.map((row) => ({
          companyName: row.companyName || null,
          transactionNumber: row.transactionNumber,
          proposalReferenceNumber: row.proposalReferenceNumber || '',
          requestor: row.requestor || 'Unknown Requestor',
          registryOfDeedName: locationMap[row.registryOfDeedId] || null,
          location: locationMap[row.registryOfDeedId] || null,
          entityCode: row.entityCode || '',
          totalAmountDue: Number(row.totalAmountDue || 0),
          paymentStatus: row.paymentStatus,
          outstandingBalance: Number(row.outstandingBalance || 0),
          amountPaid: Number(row.amountPaid || 0),
          lastModified: row.lastModified,
          createdDate: row.createdDate,
        })),
        meta: { total: totalCount, page, limit, totalPages },
      };
    } catch (error) {
      console.error(`Error generating collections reports: ${(error as Error).message}`);
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 25, totalPages: 0 },
      };
    }
  }

  async exportCollectionsReports(
    filters: CollectionsReportsExportQueryDto,
  ): Promise<CollectionsReportsExportResponseDto> {
    try {
      const exportFilters = { ...filters, page: 1, limit: 1000000 };
      const result = await this.getCollectionsReports(exportFilters, '');
      const { data } = result;

      let fileContent: string | Buffer;
      let filename: string;

      if (filters.format === 'xlsx') {
        fileContent = await this.generateCollectionsXlsx(data);
        filename = FileUtils.generateExportFilename('collections-reports', 'xlsx');
      } else {
        fileContent = await this.generateCollectionsCsv(data);
        filename = FileUtils.generateExportFilename('collections-reports', 'csv');
      }

      const mimeType = FileUtils.getMimeType(filters.format || 'csv');
      const file = FileUtils.createFileFromBuffer(
        Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, 'utf-8'),
        filename,
        mimeType,
      );

      const uploadResult = await this._storageService.uploadFile({
        file,
        folder: 'exports/reports/collections',
        fileName: filename,
      });

      const signedUrl = await this._storageService.getSignedUrl(uploadResult.key, 86400);

      return {
        downloadUrl: signedUrl,
        message: `Collections reports exported successfully as ${filters.format?.toUpperCase() || 'CSV'}`,
        statusCode: 200,
      };
    } catch (error: unknown) {
      console.error('Error exporting collections reports:', error);
      return {
        message: `Failed to export collections reports: ${(error as Error).message}`,
        statusCode: 500,
      };
    }
  }

  private async generateCollectionsCsv(data: any[]): Promise<string> {
    const rows = data.map((item) => ({
      'Company Name': item.companyName,
      'Transaction Number': item.transactionNumber,
      'Proposal Reference Number': item.proposalReferenceNumber,
      "Requestor's Name": item.requestor,
      'Entity Code': item.entityCode,
      'Total Amount Due': item.totalAmountDue,
      'Payment Status': item.status,
      'Outstanding Balance': item.outstandingBalance,
      'Amount Paid': item.amountPaid,
      'Last Modified': new Date(item.lastModified).toISOString(),
      'Created Date': new Date(item.createdDate).toISOString(),
    }));

    const parser = new (await import('json2csv')).Parser({
      fields: [
        'Company Name',
        'Transaction Number',
        'Proposal Reference Number',
        "Requestor's Name",
        'Entity Code',
        'Total Amount Due',
        'Payment Status',
        'Outstanding Balance',
        'Amount Paid',
        'Last Modified',
        'Created Date',
      ],
      header: true,
      quote: '"',
      escapedQuote: '""',
    });

    return parser.parse(rows);
  }

  private async generateCollectionsXlsx(data: any[]): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const dataWorksheet = workbook.addWorksheet('Collections Reports');

    dataWorksheet.columns = [
      { header: 'Company Name', key: 'companyName', width: 25 },
      { header: 'Transaction Number', key: 'transactionNumber', width: 20 },
      { header: 'Proposal Reference Number', key: 'proposalReferenceNumber', width: 25 },
      { header: "Requestor's Name", key: 'requestor', width: 25 },
      { header: 'Entity Code', key: 'entityCode', width: 15 },
      { header: 'Total Amount Due', key: 'totalAmountDue', width: 20 },
      { header: 'Payment Status', key: 'status', width: 20 },
      { header: 'Outstanding Balance', key: 'outstandingBalance', width: 20 },
      { header: 'Amount Paid', key: 'amountPaid', width: 20 },
      { header: 'Last Modified', key: 'lastModified', width: 25 },
      { header: 'Created Date', key: 'createdDate', width: 25 },
    ];

    data.forEach((item) =>
      dataWorksheet.addRow({
        ...item,
        lastModified: new Date(item.lastModified).toISOString(),
        createdDate: new Date(item.createdDate).toISOString(),
      }),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
