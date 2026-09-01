# Presentation Layer

## 📖 Overview & Purpose

The **Presentation Layer** (Delivery Mechanism) in Domain-Driven Design (DDD) is responsible for handling incoming external requests and returning responses. In NestJS, this consists of **REST Controllers, Route Handlers, Guards, Interceptors, and OpenAPI / Swagger documentation**.

Controllers in the presentation layer must be **thin** — they receive HTTP parameters, validate authentication / authorization headers, delegate processing to Application Services, and serialize the result into HTTP responses.

---

## 📂 Directory Structure

```text
presentation/
├── controllers/                        <-- NestJS REST Controllers
│   ├── __tests__/                      <-- Controller unit & integration tests
│   ├── audit-reports-controller.ts     <-- /api/reports/audit endpoints
│   ├── collections-reports-controller.ts <-- /api/reports/collections
│   ├── courier-reports-controller.ts   <-- /api/reports/courier
│   ├── document-reports-controller.ts  <-- /api/reports/documents
│   ├── entity-code-reports-controller.ts <-- /api/reports/entity-codes
│   ├── service-catalog-reports-controller.ts <-- /api/reports/services
│   ├── transaction-reports-controller.ts <-- /api/reports/transactions
│   └── user-reports-controller.ts      <-- /api/reports/users
└── README.md
```

---

## ✅ What Belongs in the Presentation Layer (DOs)

1. **REST Controllers & HTTP Route Mapping**:
   - NestJS `@Controller()`, `@Get()`, `@Post()`, `@Query()`, `@Param()`, `@Body()` mappings.

2. **Authentication & Authorization Guards**:
   - `@UseGuards(GatewayUserGuard)`: Enforces gateway verification signature and parses `x-user-id` context.
   - `@UseGuards(PermissionGuard)`: Evaluates `@PermissionRequired()` against injected user claims.

3. **Audit & Metadata Decorators**:
   - `@Audit('Reports/Transaction')`: Marks the resource for API Gateway audit logging.
   - `@AuditDescription('Generated transaction report')`: Human-readable audit description template.

4. **OpenAPI / Swagger Documentation**:
   - Comprehensive documentation with `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`.

5. **HTTP Response Formatting & File Downloads**:
   - Setting appropriate `Content-Type` (`text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) and `Content-Disposition` headers for direct file downloads.

---

## ❌ What Does NOT Belong in the Presentation Layer (DONTs)

| Anti-Pattern                                                                 | Where It Belongs Instead            |
| :--------------------------------------------------------------------------- | :---------------------------------- |
| **Business Logic & Calculations** (tax math, summary aggregations)           | `application/services/`             |
| **Direct Database Queries** (`Repository.createQueryBuilder()`, SQL queries) | `application/` or `infrastructure/` |
| **Direct File Generation** (`exceljs`, `json2csv` rendering)                 | `infrastructure/utils/`             |
| **Direct Third-Party SDK Calls** (AWS SDK, mailers, internal HTTP calls)     | `infrastructure/`                   |

---

## 💡 Code Examples

### 1. Thin Controller Pattern

```typescript
import { Controller, Get, Query, UseGuards, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { API_SECURITY, API_TAGS } from 'src/shared/common';
import { Audit } from 'src/shared/decorators/audit.decorator';
import { AuditDescription } from 'src/shared/decorators/audit-description.decorator';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { PermissionGuard } from 'src/shared/guards/permission.guard';
import { PermissionRequired } from 'src/shared/decorators/authorization.decorators';
import { ReqContext, RequestContextDto } from 'src/utils/req-context.decorator';
import { TransactionReportsQueryDto } from '../../application/dtos/transaction-reports-query.dto';
import { TransactionReportsResponseDto } from '../../application/dtos/transaction-reports-response.dto';
import { TransactionReportsService } from '../../application/services/transaction-reports-service';

@ApiTags(API_TAGS.REPORTS)
@ApiBearerAuth(API_SECURITY.JWT_AUTH)
@UseGuards(GatewayUserGuard, PermissionGuard)
@Controller('reports/transactions')
@Audit('Reports/Transactions')
export class TransactionReportsController {
  constructor(private readonly _reportsService: TransactionReportsService) {}

  @Get()
  @PermissionRequired('View Reports')
  @AuditDescription('Viewed transaction reports')
  @ApiOperation({ summary: 'Retrieve paginated transaction report' })
  @ApiResponse({ status: 200, type: TransactionReportsResponseDto })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTransactionReports(
    @Query() query: TransactionReportsQueryDto,
    @ReqContext() context: RequestContextDto,
  ): Promise<TransactionReportsResponseDto> {
    // Controller delegates immediately to Application Service
    return this._reportsService.getTransactionReports(query, context.user.id);
  }
}
```

### 2. Direct File Download Controller Pattern

```typescript
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { GatewayUserGuard } from 'src/shared/guards/gateway-user.guard';
import { AuditReportsService } from '../../application/services/audit-reports-service';
import { AuditReportsQueryDto } from '../../application/dtos/audit-reports-query.dto';

@Controller('reports/audit/export')
@UseGuards(GatewayUserGuard)
export class AuditExportController {
  constructor(private readonly _auditReportsService: AuditReportsService) {}

  @Get('csv')
  async downloadCsv(@Query() query: AuditReportsQueryDto, @Res() res: Response) {
    const { buffer, fileName } = await this._auditReportsService.generateCsvExport(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
```
