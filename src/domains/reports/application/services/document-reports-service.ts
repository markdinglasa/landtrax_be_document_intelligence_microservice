import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { USER_TYPE } from 'src/shared/common';
import UserEntity from 'src/shared/infrastructure/database/entities/user-entity';
import { formatFileType } from 'src/utils';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import DocumentEntity from 'src/shared/infrastructure/database/entities/document-entity';
import { DocumentReportsQueryDto } from '../dtos/document-reports-query.dto';
import { DocumentReportsResponseDto } from '../dtos/document-reports-response.dto';
import { CompanyScopeHelper } from './shared/company-scope-helper';

@Injectable()
export class DocumentReportsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly _documentRepo: Repository<DocumentEntity>,
    @InjectRepository(UserEntity)
    private readonly _userRepo: Repository<UserEntity>,
    private readonly _companyScopeHelper: CompanyScopeHelper,
  ) {}

  async getDocumentReports(filters: DocumentReportsQueryDto): Promise<DocumentReportsResponseDto> {
    try {
      const queryBuilder = this._documentRepo
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.user', 'uploader', 'uploader.deletedDate IS NULL')
        .leftJoinAndSelect(
          'document.transaction',
          'transaction',
          'transaction.deletedDate IS NULL AND transaction.deletedBy IS NULL',
        )
        .leftJoinAndSelect('transaction.user', 'user', 'user.deletedDate IS NULL')
        .leftJoinAndSelect(
          'user.userCompanies',
          'userCompanies',
          'userCompanies.deletedDate IS NULL',
        )
        .leftJoinAndSelect('userCompanies.company', 'company', 'company.deletedDate IS NULL')
        .leftJoinAndSelect(
          'document.transactionService',
          'transactionService',
          'transactionService.deletedDate IS NULL AND transactionService.deletedBy IS NULL',
        )
        .leftJoinAndSelect('document.requirement', 'requirement', 'requirement.deletedDate IS NULL')
        .leftJoinAndSelect('transactionService.service', 'service', 'service.deletedDate IS NULL')
        .where(
          'document.deletedDate IS NULL AND transaction.deletedDate IS NULL AND transactionService.deletedDate IS NULL AND requirement.deletedDate IS NULL',
        )
        .andWhere(
          'user.deletedDate IS NULL AND userCompanies.deletedDate IS NULL AND company.deletedDate IS NULL',
        );

      this.applyDocumentReportsFilters(queryBuilder, filters);
      this.applyDocumentReportSearchFilters(queryBuilder, filters);
      this.applyDocumentReportDateRangeFilters(queryBuilder, filters);

      const sortBy = filters.sortBy || 'uploadedDate';
      const sortDirection = filters.sortDirection || 'desc';
      const sortFieldMapping = {
        companyName: 'company.name',
        documentName: 'document.category',
        fileSize: 'document.fileSize',
        //documentType:'document.type', has separate sorting
        transactionNumber: 'transaction.transactionNumber',
        transactionServiceNumber: 'transactionService.transactionServiceNumber',
        serviceName: 'service.name',
        uploaderName: 'uploader.firstName',
        uploaderEmail: 'uploader.email',
        uploadedDate: 'document.createdDate',
      };

      if (sortBy === 'documentType') {
        const typeCase = `CASE 
          WHEN LOWER(document.type) LIKE '%pdf%' THEN 'PDF Document'
          WHEN LOWER(document.type) LIKE '%word%' OR LOWER(document.type) LIKE '%doc%' THEN 'Word Document'
          WHEN LOWER(document.type) LIKE '%excel%' OR LOWER(document.type) LIKE '%xls%' THEN 'Excel Spreadsheet'
          WHEN LOWER(document.type) LIKE '%powerpoint%' OR LOWER(document.type) LIKE '%ppt%' THEN 'PowerPoint Presentation'
          WHEN LOWER(document.type) LIKE '%jpeg%' OR LOWER(document.type) LIKE '%jpg%' THEN 'JPEG'
          WHEN LOWER(document.type) LIKE '%png%' THEN 'PNG'
          WHEN LOWER(document.type) LIKE '%gif%' THEN 'GIF'
          WHEN LOWER(document.type) LIKE '%bmp%' THEN 'BMP'
          WHEN LOWER(document.type) LIKE '%tiff%' THEN 'TIFF'
          WHEN LOWER(document.type) LIKE '%webp%' THEN 'WebP'
          WHEN LOWER(document.type) LIKE '%svg%' THEN 'SVG'
          WHEN LOWER(document.type) LIKE '%text/plain%' OR LOWER(document.type) = 'txt' THEN 'Text Document'
          WHEN LOWER(document.type) LIKE '%csv%' THEN 'CSV File'
          WHEN LOWER(document.type) LIKE '%zip%' THEN 'ZIP Archive'
          WHEN LOWER(document.type) LIKE '%rar%' THEN 'RAR Archive'
          WHEN LOWER(document.type) LIKE '%7z%' THEN '7Z Archive'
          WHEN LOWER(document.type) LIKE '%json%' THEN 'JSON File'
          WHEN LOWER(document.type) LIKE '%xml%' THEN 'XML File'
          WHEN LOWER(document.type) LIKE '%html%' THEN 'HTML Document'
          WHEN LOWER(document.type) LIKE '%css%' THEN 'CSS File'
          WHEN LOWER(document.type) LIKE '%javascript%' OR LOWER(document.type) = 'js' THEN 'JavaScript File'
          ELSE document.type
        END`;
        queryBuilder
          .addSelect(typeCase, 'formatted_type')
          .orderBy('formatted_type', sortDirection.toUpperCase() as 'ASC' | 'DESC');
      } else {
        const dbSortField =
          sortFieldMapping[sortBy as keyof typeof sortFieldMapping] || 'document.createdDate';
        queryBuilder.orderBy(dbSortField, sortDirection.toUpperCase() as 'ASC' | 'DESC');
      }

      const total = await queryBuilder.getCount();
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 25);
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const documents = await queryBuilder.getMany();
      const data = documents.map((document) => this.transformDocumentReportItem(document));
      const totalPages = Math.ceil(total / limit);

      return { data, meta: { total, page, limit, totalPages } };
    } catch (e: unknown) {
      console.error(`Error generating document reports: ${(e as Error).message}`);
      return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
  }

  async getClientDocumentReports(
    filters: DocumentReportsQueryDto,
    userId: string,
  ): Promise<DocumentReportsResponseDto> {
    try {
      const page = Number(filters.page ?? 1);
      const limit = Number(filters.limit ?? 50);

      const user = await this._userRepo.findOne({ where: { id: userId, deletedDate: IsNull() } });
      if (!user) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }

      const scopedUserIds = await this._companyScopeHelper.getCompanyUserIds(userId);
      if (user.type === USER_TYPE.CORPORATE && scopedUserIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }

      const queryBuilder = this._documentRepo
        .createQueryBuilder('document')
        .leftJoinAndSelect('document.user', 'uploader', 'uploader.deletedDate IS NULL')
        .leftJoinAndSelect(
          'document.transaction',
          'transaction',
          'transaction.deletedDate IS NULL AND transaction.deletedBy IS NULL',
        )
        .leftJoinAndSelect('transaction.user', 'user', 'user.deletedDate IS NULL')
        .leftJoinAndSelect(
          'user.userCompanies',
          'userCompanies',
          'userCompanies.deletedDate IS NULL',
        )
        .leftJoinAndSelect('userCompanies.company', 'company', 'company.deletedDate IS NULL')
        .leftJoinAndSelect(
          'document.transactionService',
          'transactionService',
          'transactionService.deletedDate IS NULL AND transactionService.deletedBy IS NULL',
        )
        .leftJoinAndSelect('document.requirement', 'requirement', 'requirement.deletedDate IS NULL')
        .leftJoinAndSelect('transactionService.service', 'service', 'service.deletedDate IS NULL');

      if (user.type === USER_TYPE.CORPORATE) {
        queryBuilder.where('document.userId IN (:...userIds)', { userIds: scopedUserIds });
      } else {
        queryBuilder.where('document.userId = :userId', { userId });
      }

      // Also filter out soft-deleted entities
      queryBuilder.andWhere('document.deletedDate IS NULL');

      this.applyDocumentReportsFilters(queryBuilder, filters);
      this.applyDocumentReportSearchFilters(queryBuilder, filters);
      this.applyDocumentReportDateRangeFilters(queryBuilder, filters);

      const sortBy = filters.sortBy || 'uploadedAt';
      const sortDirection = filters.sortDirection || 'desc';
      const sortFieldMapping = {
        documentName: 'document.category',
        fileSize: 'document.fileSize',
        transactionNumber: 'transaction.transactionNumber',
        transactionServiceNumber: 'transactionService.transactionServiceNumber',
        serviceName: 'service.name',
        uploaderName: 'uploader.firstName',
        uploaderEmail: 'uploader.email',
        uploadedDate: 'document.createdDate',
      };

      if (sortBy === 'documentType') {
        const typeCase = `CASE 
          WHEN LOWER(document.type) LIKE '%pdf%' THEN 'PDF Document'
          WHEN LOWER(document.type) LIKE '%word%' OR LOWER(document.type) LIKE '%doc%' THEN 'Word Document'
          WHEN LOWER(document.type) LIKE '%excel%' OR LOWER(document.type) LIKE '%xls%' THEN 'Excel Spreadsheet'
          WHEN LOWER(document.type) LIKE '%powerpoint%' OR LOWER(document.type) LIKE '%ppt%' THEN 'PowerPoint Presentation'
          WHEN LOWER(document.type) LIKE '%jpeg%' OR LOWER(document.type) LIKE '%jpg%' THEN 'JPEG'
          WHEN LOWER(document.type) LIKE '%png%' THEN 'PNG'
          WHEN LOWER(document.type) LIKE '%gif%' THEN 'GIF'
          WHEN LOWER(document.type) LIKE '%bmp%' THEN 'BMP'
          WHEN LOWER(document.type) LIKE '%tiff%' THEN 'TIFF'
          WHEN LOWER(document.type) LIKE '%webp%' THEN 'WebP'
          WHEN LOWER(document.type) LIKE '%svg%' THEN 'SVG'
          WHEN LOWER(document.type) LIKE '%text/plain%' OR LOWER(document.type) = 'txt' THEN 'Text Document'
          WHEN LOWER(document.type) LIKE '%csv%' THEN 'CSV File'
          WHEN LOWER(document.type) LIKE '%zip%' THEN 'ZIP Archive'
          WHEN LOWER(document.type) LIKE '%rar%' THEN 'RAR Archive'
          WHEN LOWER(document.type) LIKE '%7z%' THEN '7Z Archive'
          WHEN LOWER(document.type) LIKE '%json%' THEN 'JSON File'
          WHEN LOWER(document.type) LIKE '%xml%' THEN 'XML File'
          WHEN LOWER(document.type) LIKE '%html%' THEN 'HTML Document'
          WHEN LOWER(document.type) LIKE '%css%' THEN 'CSS File'
          WHEN LOWER(document.type) LIKE '%javascript%' OR LOWER(document.type) = 'js' THEN 'JavaScript File'
          ELSE document.type
        END`;
        queryBuilder
          .addSelect(typeCase, 'formatted_type')
          .orderBy('formatted_type', sortDirection.toUpperCase() as 'ASC' | 'DESC');
      } else {
        const dbSortField =
          sortFieldMapping[sortBy as keyof typeof sortFieldMapping] || 'document.createdDate';
        queryBuilder.orderBy(dbSortField, sortDirection.toUpperCase() as 'ASC' | 'DESC');
      }

      const total = await queryBuilder.getCount();
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const documents = await queryBuilder.getMany();
      const data = documents.map((document) => this.transformDocumentReportItem(document));
      const totalPages = Math.ceil(total / limit);

      return { data, meta: { total, page, limit, totalPages } };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      console.error('Sorry, Something went wrong: error: ' + (error as Error)?.message);
      return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
  }

  applyDocumentReportSearchFilters(
    queryBuilder: SelectQueryBuilder<DocumentEntity>,
    filters: DocumentReportsQueryDto,
  ): SelectQueryBuilder<DocumentEntity> {
    if (filters.search) {
      const isAliasInUse = (alias: string) =>
        queryBuilder.expressionMap.mainAlias?.name === alias ||
        queryBuilder.expressionMap.joinAttributes.some((j) => j.alias.name === alias);

      if (!isAliasInUse('uploader')) queryBuilder.leftJoin('document.user', 'uploader');
      if (!isAliasInUse('transaction'))
        queryBuilder.leftJoin('document.transaction', 'transaction');
      if (!isAliasInUse('user')) queryBuilder.leftJoin('transaction.user', 'user');
      if (!isAliasInUse('userCompanies'))
        queryBuilder.leftJoin('user.userCompanies', 'userCompanies');
      if (!isAliasInUse('company')) queryBuilder.leftJoin('userCompanies.company', 'company');
      if (!isAliasInUse('transactionService'))
        queryBuilder.leftJoin('document.transactionService', 'transactionService');
      if (!isAliasInUse('service')) queryBuilder.leftJoin('transactionService.service', 'service');

      queryBuilder.andWhere(
        '(' +
          "CONCAT(uploader.firstName, ' ', uploader.lastName) LIKE :search OR uploader.email LIKE :search OR " +
          "CONCAT(user.firstName, ' ', user.lastName) LIKE :search OR user.email LIKE :search OR " +
          'document.category LIKE :search OR document.type LIKE :search OR document.originalFileName LIKE :search OR ' +
          'transaction.transactionNumber LIKE :search OR ' +
          'transactionService.transactionServiceNumber LIKE :search OR ' +
          'service.name LIKE :search OR ' +
          'company.entityCode LIKE :search OR company.name LIKE :search' +
          ')',
        { search: `%${filters.search}%` },
      );
    }

    return queryBuilder;
  }

  applyDocumentReportDateRangeFilters(
    queryBuilder: SelectQueryBuilder<DocumentEntity>,
    filters: DocumentReportsQueryDto,
  ): SelectQueryBuilder<DocumentEntity> {
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
        queryBuilder.andWhere('document.createdDate >= :dateFrom', { dateFrom });
      }
      if (dateTo) {
        queryBuilder.andWhere('ISNULL(document.updatedDate, document.createdDate) <= :dateTo', {
          dateTo: new Date(dateTo),
        });
      }
    }

    return queryBuilder;
  }
  applyDocumentReportsFilters(
    queryBuilder: SelectQueryBuilder<DocumentEntity>,
    filters: DocumentReportsQueryDto,
  ): SelectQueryBuilder<DocumentEntity> {
    if (filters.transactionNumber) {
      queryBuilder.andWhere('transaction.transactionNumber LIKE :transactionNumber', {
        transactionNumber: `%${filters.transactionNumber}%`,
      });
    }

    if (filters.category) {
      const categories = filters.category.split(',').map((cat: string) => cat.trim());
      queryBuilder.andWhere('document.category IN (:...categories)', { categories });
    }

    const documentTypes = this._normalizeArrayFilter(filters.types);
    if (documentTypes.length > 0) {
      queryBuilder.andWhere('document.type IN (:...documentTypes)', { documentTypes });
    }

    if (filters.uploader) {
      if (!queryBuilder.expressionMap.joinAttributes.some((j) => j.alias.name === 'uploader')) {
        queryBuilder.leftJoin('document.user', 'uploader');
      }
      queryBuilder.andWhere(
        '(uploader.firstName LIKE :uploader OR uploader.lastName LIKE :uploader OR uploader.email LIKE :uploader)',
        { uploader: `%${filters.uploader}%` },
      );
    }

    if (filters.minSize !== undefined && filters.minSize !== null) {
      queryBuilder.andWhere('document.fileSize >= :minSize', { minSize: filters.minSize });
    }

    if (filters.maxSize !== undefined && filters.maxSize !== null) {
      queryBuilder.andWhere('document.fileSize <= :maxSize', { maxSize: filters.maxSize });
    }

    this._applyUserTypeFilter(queryBuilder, filters.userType);

    return queryBuilder;
  }

  private _applyUserTypeFilter(
    queryBuilder: SelectQueryBuilder<DocumentEntity>,
    userType?: string,
  ): void {
    if (!userType) return;

    // Map frontend filter values to USER_TYPE enum values
    // Filter directly on user.type field instead of role relationships
    const userTypeMap: Record<string, USER_TYPE> = {
      Individual: USER_TYPE.INDIVIDUAL,
      Corporate: USER_TYPE.CORPORATE,
    };

    const mappedUserType = userTypeMap[userType];
    if (!mappedUserType) return;

    const isAliasInUse = (alias: string) =>
      queryBuilder.expressionMap.mainAlias?.name === alias ||
      queryBuilder.expressionMap.joinAttributes.some((j) => j.alias.name === alias);

    // Ensure transaction and user joins exist
    if (!isAliasInUse('transaction')) queryBuilder.leftJoin('document.transaction', 'transaction');
    if (!isAliasInUse('user')) queryBuilder.leftJoin('transaction.user', 'user');

    // Filter on the user's type field directly
    queryBuilder.andWhere('user.type = :userType', { userType: mappedUserType });
  }

  private transformDocumentReportItem(document: DocumentEntity): any {
    return {
      id: document.id,
      filename: document.originalFileName || `document_${document.id}`,
      originalFilename: document.originalFileName || '',
      fileSize: Number(document.fileSize),
      mimeType: formatFileType(document.type),
      category: document.category || 'OTHER',
      parentTransactionRef:
        document.transaction?.transactionNumber ||
        document.transactionService?.transactionServiceNumber.substring(
          0,
          document.transactionService?.transactionServiceNumber.length - 7,
        ) ||
        null,
      childTransactionRef: document.transactionService?.transactionServiceNumber || null,
      serviceName: document.transactionService?.service?.name,
      requirementName: document.requirement?.name,
      uploader: document.user
        ? {
            id: document.user?.id,
            name: `${document.user?.firstName || ''} ${document.user?.lastName || ''}`.trim(),
            email: document.user?.email || '',
            role: 'User',
          }
        : { id: '', name: 'Unknown User', email: '', role: 'Unknown' },
      fileUrl: document.fileURL,
      entityCode: document?.transaction?.user?.userCompanies
        ?.map((item) => item.company?.entityCode)
        .join(''),
      companyName: document?.transaction?.user?.userCompanies
        ?.map((item) => item.company?.name)
        .join(', '),
      createdDate: document.createdDate,
    };
  }

  private _normalizeArrayFilter(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter((v) => v && v !== 'all');
    }
    // Split comma-separated string into array
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && v !== 'all');
  }
}
