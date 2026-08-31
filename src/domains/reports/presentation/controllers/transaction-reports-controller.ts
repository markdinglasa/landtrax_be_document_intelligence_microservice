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
import { TransactionReportsQueryDto } from '../../application/dtos/transaction-reports-query.dto';
import { TransactionReportsResponseDto } from '../../application/dtos/transaction-reports-response.dto';
import { TransactionReportsSummaryQueryDto } from '../../application/dtos/transaction-reports-summary-query.dto';
import { TransactionReportsSummaryResponseDto } from '../../application/dtos/transaction-reports-summary-response.dto';
import ReportsService from '../../application/services/reports-service';

@ApiTags(common.API_TAGS.REPORTS)
@ApiBearerAuth(common.API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard)
@Controller('reports/transactions')
@Audit('Reports/Transactions')
export class TransactionReportsController {
  constructor(private readonly _reportsService: ReportsService) {}

  @Get()
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_TRANSACTION_REPORTS)
  @AuditDescription('Reviewed detailed transaction lifecycle and volume reports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getTransactionReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: TransactionReportsQueryDto,
  ) {
    return await this._reportsService.getTransactionReports(query);
  }

  @Get('summary')
  @UseGuards(PermissionGuard)
  @PermissionRequired(AppPermission.VIEW_TRANSACTION_REPORTS)
  @AuditDescription('Reviewed high-level executive summary of transaction volumes')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getTransactionReportsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query() query: TransactionReportsSummaryQueryDto,
  ): Promise<TransactionReportsSummaryResponseDto> {
    return await this._reportsService.getTransactionReportsSummary(query);
  }

  @Get('client')
  @UseGuards(PermissionGuard)
  @AnyPermission(AppPermission.VIEW_TRANSACTION_REPORTS)
  @AuditDescription('Reviewed personal transaction history and status reports')
  @ApiOperation({ summary: 'Get client transaction reports' })
  @ApiResponse({
    status: 200,
    description: 'Client transaction reports retrieved successfully',
  })
  async getClientTransactionReports(
    @ReqContext() _req: RequestContextDto,
    @Query() query: TransactionReportsQueryDto,
  ): Promise<TransactionReportsResponseDto> {
    return await this._reportsService.getClientTransactionReports(query, _req.userId);
  }

  @Get('client/summary')
  @UseGuards(PermissionGuard)
  @AnyPermission(AppPermission.VIEW_TRANSACTION_REPORTS)
  @AuditDescription('Reviewed high-level executive summary of transaction volumes')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getClientTransactionReportsSummary(
    @ReqContext() _req: RequestContextDto,
    @Query() query: TransactionReportsSummaryQueryDto,
  ): Promise<TransactionReportsSummaryResponseDto> {
    return await this._reportsService.getTransactionReportsSummary(query, _req.userId);
  }
}
