# Infrastructure Layer

## 📖 Overview & Purpose

The **Infrastructure Layer** in Domain-Driven Design (DDD) contains the concrete technical implementations of interfaces defined in the domain and application layers. It encapsulates low-level concerns such as **file serialization (CSV/Excel/PDF rendering), cloud storage adapters, database query adapters, and external message queues**.

---

## 📂 Directory Structure

```text
infrastructure/
├── utils/                              <-- File Generation Engines & Formatters
│   ├── audit-csv-generator.ts          <-- High-throughput streaming CSV serialization
│   ├── audit-xlsx-generator.ts         <-- Excel generation with ExcelJS styling
│   └── file-utils.ts                   <-- File naming, timestamping & buffer helpers
├── adapters/                           <-- Adapters implementing Domain Ports
│   ├── s3-storage.adapter.ts           <-- AWS S3 / Cloud Storage integration
│   └── typeorm-reports.adapter.ts      <-- Complex database aggregation queries
└── README.md
```

---

## ✅ What Belongs in the Infrastructure Layer (DOs)

1. **File Generation Engines**:
   - Heavy computational formatting using libraries like `exceljs`, `json2csv`, `pdfkit`, or `archiver`.
   - Example: `AuditCsvGenerator`, `AuditXlsxGenerator`.

2. **File & Binary I/O Utilities**:
   - Generating standard file names (`FileUtils.generateReportFileName()`), computing hashes, formatting timestamps, and managing streams.

3. **Storage & Cloud Adapters**:
   - Adapters connecting to S3, Google Cloud Storage, or local disk storage.

4. **Background Job Processors**:
   - Queue consumers (BullMQ / Redis) processing large asynchronous exports in the background.

---

## ❌ What Does NOT Belong in the Infrastructure Layer (DONTs)

| Anti-Pattern                                                             | Where It Belongs Instead |
| :----------------------------------------------------------------------- | :----------------------- |
| **HTTP Routing & REST Endpoints** (`@Controller()`, `@Get()`, `@Post()`) | `presentation/`          |
| **Inbound Request DTO Validation** (`class-validator` schemas)           | `application/dtos/`      |
| **Core Domain Business Rules & Invariants**                              | `domain/`                |
| **Use Case Orchestration Workflow Logic**                                | `application/services/`  |

---

## 💡 Code Examples

### 1. File Generation Engine Pattern (CSV)

```typescript
import { Parser } from 'json2csv';
import { Logger } from '@nestjs/common';

export interface AuditExportRow {
  date: string;
  action: string;
  user: string;
  ip: string;
  details: string;
}

export class AuditCsvGenerator {
  private static readonly logger = new Logger(AuditCsvGenerator.name);

  static generateCsv(data: AuditExportRow[]): Buffer {
    try {
      const fields = [
        { label: 'Date & Time', value: 'date' },
        { label: 'Action', value: 'action' },
        { label: 'User', value: 'user' },
        { label: 'IP Address', value: 'ip' },
        { label: 'Details', value: 'details' },
      ];

      const parser = new Parser({ fields });
      const csvString = parser.parse(data);
      return Buffer.from(csvString, 'utf-8');
    } catch (err: any) {
      AuditCsvGenerator.logger.error(`Failed to generate CSV: ${err.message}`);
      throw err;
    }
  }
}
```

### 2. Excel Generation Engine Pattern (ExcelJS)

```typescript
import * as ExcelJS from 'exceljs';

export class AuditXlsxGenerator {
  static async generateWorkbook(data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Report');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Action', key: 'action', width: 30 },
      { header: 'User', key: 'user', width: 30 },
      { header: 'IP', key: 'ip', width: 20 },
    ];

    // Format header styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((row) => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
```
