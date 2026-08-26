import { Parser } from 'json2csv';

export interface AuditExportRow {
  timestamp: string;
  user: string;
  userType: string;
  company: string;
  action: string;
  module: string;
  status: string;
  details: string;
}

/**
 * Generates a CSV string from audit log export rows.
 * Follows the US001 column spec:
 *   Timestamp | User | User Type | Company | Action | Module | Status | Details
 */
export class AuditCsvGenerator {
  private static readonly HEADERS: (keyof AuditExportRow)[] = [
    'timestamp',
    'user',
    'userType',
    'company',
    'action',
    'module',
    'status',
    'details',
  ];

  private static readonly HEADER_LABELS: Record<keyof AuditExportRow, string> = {
    timestamp: 'Timestamp',
    user: 'User',
    userType: 'User Type',
    company: 'Company',
    action: 'Action',
    module: 'Module',
    status: 'Status',
    details: 'Details',
  };

  static generate(rows: AuditExportRow[]): string {
    const fields = AuditCsvGenerator.HEADERS.map((key) => ({
      label: AuditCsvGenerator.HEADER_LABELS[key],
      value: key,
    }));

    const parser = new Parser({
      fields,
      header: true,
      quote: '"',
      escapedQuote: '""',
    });

    return parser.parse(rows);
  }
}
