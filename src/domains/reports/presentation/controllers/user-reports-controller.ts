import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as common from 'src/shared/common';
import { AppPermission } from 'src/shared/common/permissions';
import { Audit } from 'src/shared/decorators/audit.decorator';
import { AuditDescription } from 'src/shared/decorators/audit-description.decorator';
import { AnyPermission, PermissionRequired } from 'src/shared/decorators/authorization.decorators';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ReqContext, RequestContextDto } from 'src/utils/req-context.decorator';
import { UserReportsQueryDto } from '../../application/dtos/user-reports-query.dto';
import { UserReportsSummaryQueryDto } from '../../application/dtos/user-reports-summary-query.dto';
import ReportsService from '../../application/services/reports-service';

@ApiTags(common.API_TAGS.REPORTS)
@ApiBearerAuth(common.API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard)
@Controller('reports/users')
@Audit('Reports/Users')
export class UserReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_USER_REPORTS)
  @AuditDescription('Reviewed user account activity and membership reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getUserReports(@ReqContext() _req: RequestContextDto, @Query() query: UserReportsQueryDto) {
    return await this._reportsService.getUserReports(query);
  }

  @Get('summary')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_USER_REPORTS)
  @AuditDescription('Reviewed executive summary of user account activity and growth metrics')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getUserReportsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query() query: UserReportsSummaryQueryDto,
  ) {
    return await this._reportsService.getUserReportsSummary(query);
  }

  @Get('client')
  @UseGuards(PermissionGuard)
  @AnyPermission(AppPermission.VIEW_USER_REPORTS)
  @AuditDescription('Reviewed personal account activity and organizational user reports')
  @ApiOperation({ summary: 'Get client user reports' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Client user reports retrieved successfully' })
  async getClientUserReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: UserReportsQueryDto,
  ) {
    return await this._reportsService.getClientUserReports(query, _req.userId);
  }

  @Get('client/summary')
  @UseGuards(PermissionGuard)
  @AnyPermission(AppPermission.VIEW_USER_REPORTS)
  @AuditDescription('Reviewed summary of organizational user counts and status metrics')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getClientUserReportsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query() query: UserReportsSummaryQueryDto,
  ) {
    return await this._reportsService.getUserReportsSummary(query, _req.userId);
  }
}
