import * as ExcelJS from 'exceljs';
import { AuditExportRow } from './audit-csv-generator';

/**
 * Generates an Excel (.xlsx) buffer from audit log export rows.
 * Follows the US001 column spec:
 *   Timestamp | User | User Type | Company | Action | Module | Status | Details
 */
export class AuditXlsxGenerator {
  static async generate(rows: AuditExportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Logs');

    sheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 22 },
      { header: 'User', key: 'user', width: 30 },
      { header: 'User Type', key: 'userType', width: 15 },
      { header: 'Company', key: 'company', width: 30 },
      { header: 'Action', key: 'action', width: 18 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Details', key: 'details', width: 60 },
    ];

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    rows.forEach((row) => {
      sheet.addRow({
        timestamp: row.timestamp,
        user: row.user,
        userType: row.userType,
        company: row.company,
        action: row.action,
        module: row.module,
        status: row.status,
        details: row.details,
      });
    });

    // Auto-filter on header row
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
