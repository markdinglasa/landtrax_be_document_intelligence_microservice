# Domain Layer

## 📖 Overview & Purpose

The **Domain Layer** represents the heart of the business in Domain-Driven Design (DDD). It contains the **enterprise business rules, aggregates, entities, value objects, domain specifications, and repository port interfaces**.

In DDD, the domain layer is **pure, framework-agnostic, and persistence-ignorant**. It contains NO framework dependencies (no NestJS decorators, no TypeORM decorators, no Express types, no AWS SDKs).

---

## 📂 Directory Structure

```text
domain/
├── models/                             <-- Pure Domain Entities & Value Objects
│   ├── report-date-range.vo.ts         <-- Value Object encapsulating date-range invariants
│   ├── export-job.model.ts             <-- Domain model for asynchronous export tracking
│   └── report-criteria.model.ts        <-- Report filter specifications
├── specifications/                     <-- Business Rules & Invariant Policies
│   ├── export-threshold.policy.ts      <-- Business policy determining sync vs async export
│   └── report-date-range.validator.ts  <-- Rules for valid reporting windows (e.g. max 90 days)
├── ports/                              <-- Abstract Interfaces (Ports)
│   ├── report-storage.port.ts          <-- Port for file storage operations
│   └── reports-repository.port.ts      <-- Port for data access
├── enums/                              <-- Domain Enums
│   ├── report-format.enum.ts           <-- CSV, XLSX, PDF
│   └── export-status.enum.ts           <-- PENDING, PROCESSING, COMPLETED, FAILED
└── README.md
```

---

## ✅ What Belongs in the Domain Layer (DOs)

1. **Value Objects (Immutable Business Concepts)**:
   - Objects defined by their attributes rather than a persistent ID (e.g., `ReportDateRange`, `Money`, `EmailAddress`).
   - Must validate their own invariants on construction.

2. **Domain Entities & Aggregate Roots**:
   - Business objects with distinct identity and lifecycles (e.g., `ExportJob`).

3. **Port Interfaces (Contracts)**:
   - TypeScript interfaces defining what operations the domain requires from infrastructure without binding to how they are implemented.
   - Example: `IReportStoragePort`, `IReportsRepository`.

4. **Domain Policies & Specifications**:
   - Pure domain rules (e.g., `ExportThresholdPolicy: records > 5,000 must be queued asynchronously`).

5. **Domain Exceptions**:
   - Typed domain errors (e.g., `InvalidDateRangeException`, `ExportQuotaExceededException`).

---

## ❌ What Does NOT Belong in the Domain Layer (DONTs)

| Anti-Pattern                                                                 | Where It Belongs Instead                   |
| :--------------------------------------------------------------------------- | :----------------------------------------- |
| **NestJS Decorators** (`@Injectable()`, `@Module()`, `@Controller()`)        | `application/` or `presentation/`          |
| **TypeORM / Database Decorators** (`@Entity()`, `@Column()`, `@ManyToOne()`) | `shared/infrastructure/database/entities/` |
| **External SDK Imports** (`@aws-sdk`, `axios`, `exceljs`, `fs`)              | `infrastructure/`                          |
| **HTTP Concerns & DTOs** (Swagger `@ApiProperty()`, `class-validator`)       | `application/dtos/`                        |

---

## 💡 Code Examples

### 1. Value Object with Invariant Validation

```typescript
// domain/models/report-date-range.vo.ts
export class ReportDateRange {
  private readonly _startDate: Date;
  private readonly _endDate: Date;
  private static readonly MAX_RANGE_DAYS = 90;

  constructor(startDate: Date | string, endDate: Date | string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format provided for reporting window.');
    }

    if (start > end) {
      throw new Error('Start date cannot be later than end date.');
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    if (diffDays > ReportDateRange.MAX_RANGE_DAYS) {
      throw new Error(`Report date range cannot exceed ${ReportDateRange.MAX_RANGE_DAYS} days.`);
    }

    this._startDate = start;
    this._endDate = end;
  }

  get startDate(): Date {
    return new Date(this._startDate);
  }
  get endDate(): Date {
    return new Date(this._endDate);
  }
}
```

### 2. Domain Repository Port (Interface)

```typescript
// domain/ports/report-storage.port.ts
export interface IReportStoragePort {
  uploadReportFile(params: {
    fileName: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ fileKey: string }>;

  generateDownloadUrl(fileKey: string, expiresInSeconds: number): Promise<string>;
}
```

### 3. Domain Policy

```typescript
// domain/specifications/export-threshold.policy.ts
export class ExportThresholdPolicy {
  public static readonly ASYNC_THRESHOLD = 5000;

  static requiresAsyncProcessing(estimatedCount: number): boolean {
    return estimatedCount >= ExportThresholdPolicy.ASYNC_THRESHOLD;
  }
}
```
