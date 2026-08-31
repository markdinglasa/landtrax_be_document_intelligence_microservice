import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as common from 'src/shared/common';
import { AppPermission } from 'src/shared/common/permissions';
import { Audit } from 'src/shared/decorators/audit.decorator';
import { AuditDescription } from 'src/shared/decorators/audit-description.decorator';
import { AnyPermission, PermissionRequired } from 'src/shared/decorators/authorization.decorators';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ReqContext, RequestContextDto } from 'src/utils/req-context.decorator';
import { DocumentReportsQueryDto } from '../../application/dtos/document-reports-query.dto';
import ReportsService from '../../application/services/reports-service';

@ApiTags(common.API_TAGS.REPORTS)
@ApiBearerAuth(common.API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard)
@Controller('reports/documents')
@Audit('Reports/Documents')
export class DocumentReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_DOCUMENTS_REPORTS)
  @AuditDescription('Reviewed document management and requirement compliance reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getDocumentReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: DocumentReportsQueryDto,
  ) {
    return await this._reportsService.getDocumentReports(query);
  }

  @Get('client')
  @UseGuards(PermissionGuard)
  @AnyPermission(AppPermission.VIEW_DOCUMENTS_REPORTS)
  @AuditDescription('Reviewed personal document inventory and compliance reports')
  @ApiOperation({ summary: 'Get client document reports' })
  @ApiResponse({
    status: 200,
    description: 'Client document reports retrieved successfully',
  })
  async getClientDocumentReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: DocumentReportsQueryDto,
  ) {
    return await this._reportsService.getClientDocumentReports(query, _req.userId);
  }
}
