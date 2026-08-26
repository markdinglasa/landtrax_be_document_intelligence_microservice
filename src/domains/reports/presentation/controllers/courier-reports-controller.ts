import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { API_SECURITY, API_TAGS } from 'src/shared/common';
import { AppPermission } from 'src/shared/common/permissions';
import { Audit } from 'src/modules/audit-trail/decorators/audit-decorator';
import { AuditDescription } from 'src/modules/audit-trail/decorators/audit-description-decorator';
import { PermissionRequired } from 'src/modules/authentication/decorators/authorization-decorators';
import JwtAuthGuard from 'src/modules/authentication/utils/jwt-auth-guard';
import { PermissionGuard } from 'src/modules/authentication/utils/permission-guard';
import { ReqContext, RequestContextDto } from 'src/utils';
import { CourierReportsQueryDto } from '../../application/dtos/courier-reports-query.dto';
import ReportsService from '../../application/services/reports-service';

@ApiTags(API_TAGS.REPORTS)
@ApiBearerAuth(API_SECURITY.JWT_AUTH)
@UseGuards(JwtAuthGuard)
@Controller('reports/courier')
@Audit('Reports/Courier')
export class CourierReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_COURIER_REPORTS)
  @AuditDescription('Reviewed courier delivery performance and operational reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getCourierReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: CourierReportsQueryDto,
  ) {
    return await this._reportsService.getCourierReports(_req.userId, query);
  }
}
