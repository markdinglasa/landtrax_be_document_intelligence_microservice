import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { API_SECURITY, API_TAGS } from 'src/shared/common';
import { AppPermission } from 'src/shared/common/permissions';
import { Audit } from 'src/shared/decorators/audit.decorator';
import { AuditDescription } from 'src/shared/decorators/audit-description.decorator';
import { PermissionRequired } from 'src/shared/decorators/authorization.decorators';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { ServiceCatalogReportsQueryDto } from '../../application/dtos/service-catalog-reports-query.dto';
import ReportsService from '../../application/services/reports-service';

@ApiTags(API_TAGS.REPORTS)
@ApiBearerAuth(API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard)
@Controller('reports/service-catalogs')
@Audit('Reports/ServiceCatalogs')
export class ServiceCatalogReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_SERVICES_CATALOGS)
  @AuditDescription('Generated Service Catalog reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getServiceCatalogReports(@Query() query: ServiceCatalogReportsQueryDto) {
    return await this._reportsService.getServiceCatalogReports(query);
  }
}
