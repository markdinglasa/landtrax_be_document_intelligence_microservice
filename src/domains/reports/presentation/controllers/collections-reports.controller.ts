import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { API_SECURITY, API_TAGS } from 'src/shared/common';
import { AppPermission } from 'src/shared/common/permissions';
import { AuditDescription } from 'src/shared/decorators/audit-description.decorator';
import { Audit } from 'src/shared/decorators/audit.decorator';
import { PermissionRequired } from 'src/shared/decorators/authorization.decorators';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ReqContext, RequestContextDto } from 'src/utils/req-context.decorator';
import { CollectionsReportsExportQueryDto } from '../../application/dtos/collections-reports-export-query.dto';
import { CollectionsReportsExportResponseDto } from '../../application/dtos/collections-reports-export-response.dto';
import { CollectionsReportsQueryDto } from '../../application/dtos/collections-reports-query.dto';
import ReportsService from '../../application/services/reports.service';

@ApiTags(API_TAGS.REPORTS)
@ApiBearerAuth(API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard)
@Controller('reports/collections')
@Audit('Reports/Collections')
export class CollectionsReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_PAYMENTS_REPORTS)
  @AuditDescription('Reviewed financial collection and payment status reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCollectionsReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: CollectionsReportsQueryDto,
  ) {
    return await this._reportsService.getCollectionsReports(query, _req.userId);
  }

  @Get('export')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.EXPORT_PAYMENT_REPORT)
  @AuditDescription('Exported financial collections and revenue reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportCollectionsReports(
    @Query() query: CollectionsReportsExportQueryDto,
    @ReqContext() _req: RequestContextDto,
  ): Promise<CollectionsReportsExportResponseDto> {
    return await this._reportsService.exportCollectionsReports(query);
  }
}
