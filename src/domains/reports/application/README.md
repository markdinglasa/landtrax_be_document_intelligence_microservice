# Application Layer

## 📖 Overview & Purpose

The **Application Layer** in Domain-Driven Design (DDD) defines the system's use cases and orchestrates application workflows. It handles the **application business logic** (as opposed to domain enterprise business rules). It coordinates domain services, database repositories, and infrastructure adapters to fulfill user requests, while remaining completely independent of delivery mechanisms (HTTP, WebSockets, CLI).

---

## 📂 Directory Structure

```text
application/
├── dtos/                               <-- Data Transfer Objects for requests, responses & tables
│   ├── audit-reports-query.dto.ts      <-- Filtering and pagination query parameters
│   ├── audit-reports-response.dto.ts   <-- Outbound serialized payload structure
│   ├── audit-report-item.dto.ts        <-- Flat tabular item representation
│   ├── transaction-reports-*.dto.ts
│   ├── collections-reports-*.dto.ts
│   ├── courier-reports-*.dto.ts
│   ├── document-reports-*.dto.ts
│   ├── entity-code-reports-*.dto.ts
│   └── service-catalog-reports-*.dto.ts
├── services/                           <-- Application Services (Use Case Handlers)
│   ├── __tests__/                      <-- Unit tests for use cases & aggregation logic
│   ├── audit-reports-service.ts        <-- Audit reporting & export orchestration
│   ├── transaction-reports-service.ts  <-- Transaction data aggregation
│   ├── user-reports-service.ts         <-- User activity & masterfile reporting
│   ├── collections-reports-service.ts  <-- Payment collection analytics
│   ├── courier-reports-service.ts      <-- Courier shipment tracking reports
│   ├── document-reports-service.ts     <-- Document catalog reports
│   ├── entity-code-reports-service.ts  <-- Entity code utilization metrics
│   ├── service-catalog-reports-service.ts
│   ├── audit-export-rate-limit.service.ts <-- Rate limiting & async export thresholding
│   ├── reports-service.ts              <-- Domain coordinator / facade
│   └── shared/
│       └── company-scope-helper.ts     <-- Multi-tenant company isolation logic
└── README.md
```

---

## ✅ What Belongs in the Application Layer (DOs)

1. **Application Services / Use Cases**:
   - Services orchestrating data retrieval, business workflows, rate-limiting, and async queue offloading.
   - Example: `AuditReportsService`, `TransactionReportsService`.

2. **Data Transfer Objects (DTOs)**:
   - Request DTOs with strict `class-validator` decorators (`@IsDateString()`, `@IsOptional()`, `@Min()`, `@Max()`).
   - Response DTOs structuring summary counts, charts, and paginated lists.

3. **Multi-Tenancy & Authorization Scope Enforcement**:
   - Applying user/company access boundaries to query builders (e.g., `CompanyScopeHelper`).

4. **Unit Tests for Use Cases**:
   - Testing business workflows, pagination edge-cases, and aggregation accuracy in `services/__tests__/`.

---

## ❌ What Does NOT Belong in the Application Layer (DONTs)

| Anti-Pattern                                                                             | Where It Belongs Instead |
| :--------------------------------------------------------------------------------------- | :----------------------- |
| **HTTP Routing & Controllers** (`@Controller()`, `@Get()`, `@Post()`, `@UseGuards()`)    | `presentation/`          |
| **Direct Express Objects** (`req`, `res`, `res.setHeader()`, `res.status()`)             | `presentation/`          |
| **Low-Level File Serialization** (`exceljs`, `json2csv`, PDF generation, binary buffers) | `infrastructure/`        |
| **Third-Party I/O SDKs** (AWS S3 client, nodemailer, disk writers)                       | `infrastructure/`        |
| **Core Entity Invariants & Value Objects**                                               | `domain/`                |

---

## 💡 Code Examples

### 1. Application Service Pattern

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import TransactionEntity from 'src/shared/infrastructure/database/entities/transaction.entity';
import { TransactionReportsQueryDto } from '../dtos/transaction-reports-query.dto';
import { TransactionReportsResponseDto } from '../dtos/transaction-reports-response.dto';
import { CompanyScopeHelper } from './shared/company-scope-helper';

@Injectable()
export class TransactionReportsService {
  private readonly _logger = new Logger(TransactionReportsService.name);

  constructor(
    @InjectRepository(TransactionEntity)
    private readonly _transactionRepo: Repository<TransactionEntity>,
    private readonly _companyScopeHelper: CompanyScopeHelper,
  ) {}

  async getTransactionReports(
    query: TransactionReportsQueryDto,
    userId: string,
  ): Promise<TransactionReportsResponseDto> {
    const qb = this._transactionRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.staging', 'staging')
      .leftJoinAndSelect('tx.createdByUser', 'user');

    // 1. Apply multi-tenant company security scope
    await this._companyScopeHelper.applyScope(qb, userId);

    // 2. Apply query filters
    if (query.startDate && query.endDate) {
      qb.andWhere('tx.createdDate BETWEEN :start AND :end', {
        start: query.startDate,
        end: query.endDate,
      });
    }

    if (query.status) {
      qb.andWhere('staging.code = :status', { status: query.status });
    }

    // 3. Paginate & return formatted DTO
    const [items, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: items.map(this.mapToItemDto),
      meta: { total, page: query.page, limit: query.limit },
    };
  }

  private mapToItemDto(tx: TransactionEntity) {
    return {
      id: tx.id,
      transactionNumber: tx.transactionNumber,
      status: tx.staging?.name ?? 'Unknown',
      createdDate: tx.createdDate,
    };
  }
}
```

### 2. Query DTO Pattern

```typescript
import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionReportsQueryDto {
  @ApiPropertyOptional({ description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 20;
}
```
