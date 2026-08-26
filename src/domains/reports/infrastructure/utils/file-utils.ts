import { formatToUserDate } from 'src/utils/date-utils';
export class FileUtils {
  /**
   * Generate a unique filename for export files
   */
  static generateExportFilename(prefix: string, format: 'csv' | 'xlsx'): string {
    const timestamp = formatToUserDate(new Date()).replaceAll('/', '_').replaceAll(' ', '_');
    const category = prefix.toUpperCase();
    return `${category}_${timestamp}.${format}`;
  }

  /**
   * Get MIME type for file format
   */
  static getMimeType(format: 'csv' | 'xlsx'): string {
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[format];
  }

  /**
   * Convert buffer to Express.Multer.File-like object for S3 upload
   */
  static createFileFromBuffer(
    buffer: Buffer,
    filename: string,
    mimetype: string,
  ): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      buffer,
      size: buffer.length,
      destination: '',
      filename,
      path: '',
      stream: null as any,
    };
  }
}
