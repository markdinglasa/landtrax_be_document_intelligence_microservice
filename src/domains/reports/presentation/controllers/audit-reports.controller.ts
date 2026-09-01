import { API_SECURITY, API_TAGS, AppPermission } from 'src/shared/common';
import { AuditDescription } from 'src/shared/decorators/audit-description.decorator';
import { PermissionRequired } from 'src/shared/decorators/authorization.decorators';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ReqContext, RequestContextDto } from 'src/utils/req-context.decorator';

import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from 'src/shared/decorators/audit.decorator';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { AuditReportsExportQueryDto } from '../../application/dtos/audit-reports-export-query.dto';
import {
  AuditExportJobStatusResponseDto,
  AuditReportsExportResponseDto,
} from '../../application/dtos/audit-reports-export-response.dto';
import { AuditReportsQueryDto } from '../../application/dtos/audit-reports-query.dto';
import { AuditReportsResponseDto } from '../../application/dtos/audit-reports-response.dto';
import ReportsService from '../../application/services/reports.service';

@ApiTags(API_TAGS.REPORTS)
@ApiBearerAuth(API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard)
@Controller('reports/audit')
@Audit('Reports/Audit')
export class AuditReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_AUDIT_TRAIL_REPORTS)
  @AuditDescription('Reviewed regulatory compliance and system activity audit reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getAuditReports(@Query() query: AuditReportsQueryDto): Promise<AuditReportsResponseDto> {
    return await this._reportsService.getAuditReports(query);
  }

  @Get('export')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_AUDIT_TRAIL_REPORTS)
  @ApiOperation({
    summary:
      'Export audit logs as CSV or XLSX. Large exports (≥10,000 rows) are processed asynchronously.',
  })
  @AuditDescription('Exported audit trail logs')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async exportAuditReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: AuditReportsExportQueryDto,
  ): Promise<AuditReportsExportResponseDto> {
    const user = await this._reportsService.findUserById(_req.userId);
    if (!user) throw new NotFoundException('User not found');

    return await this._reportsService.exportAuditReports(query, user);
  }

  @Get('export/job/:jobId')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_AUDIT_TRAIL_REPORTS)
  @ApiOperation({ summary: 'Poll the status of an async audit log export job' })
  @AuditDescription('Checked audit log export job status')
  async getAuditExportJobStatus(
    @ReqContext() _req: RequestContextDto,
    @Param('jobId') jobId: string,
  ): Promise<AuditExportJobStatusResponseDto> {
    return await this._reportsService.getAuditExportJobStatus(jobId, _req.userId);
  }

  @Post('export/job/:jobId/retry')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_AUDIT_TRAIL_REPORTS)
  @ApiOperation({ summary: 'Retry a failed async audit log export job' })
  @AuditDescription('Retried a failed audit log export job')
  async retryAuditExportJob(
    @ReqContext() _req: RequestContextDto,
    @Param('jobId') jobId: string,
  ): Promise<AuditReportsExportResponseDto> {
    const user = await this._reportsService.findUserById(_req.userId);
    if (!user) throw new NotFoundException('User not found');

    return await this._reportsService.retryAuditExportJob(jobId, user);
  }

  @Get('actions')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_AUDIT_TRAIL_REPORTS)
  @ApiOperation({ summary: 'Get distinct action types for the audit reports filter' })
  @AuditDescription('Fetched audit report action types')
  async getAuditReportActions(
    @ReqContext() _req: RequestContextDto,
  ): Promise<{ actions: string[] }> {
    return await this._reportsService.getAuditReportActions();
  }

  @Get('resources')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_AUDIT_TRAIL_REPORTS)
  @ApiOperation({ summary: 'Get distinct resource/entity types for the audit reports filter' })
  @AuditDescription('Fetched audit report resource types')
  async getAuditReportResources(
    @ReqContext() _req: RequestContextDto,
  ): Promise<{ resources: string[] }> {
    return await this._reportsService.getAuditReportResources();
  }
}
