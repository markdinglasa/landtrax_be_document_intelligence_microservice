// Inlined from monolith src/assets — avoids external dependency
const CORPORATE_SUB_USER = 'Corporate Sub-User';

export function mainRoleTransform(role: string): string {
  return role?.includes(CORPORATE_SUB_USER) ? CORPORATE_SUB_USER : role;
}

// Local file type formatter for this panel only
export const formatFileType = (type?: string | null): string => {
  if (!type) return 'Unknown';

  const typeMap: Record<string, string> = {
    // MIME types
    'application/pdf': 'PDF Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'PowerPoint Presentation',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/bmp': 'BMP',
    'image/tiff': 'TIFF',
    'image/webp': 'WebP',
    'image/svg+xml': 'SVG',
    'text/plain': 'Text Document',
    'text/csv': 'CSV File',
    'application/zip': 'ZIP Archive',
    'application/x-rar-compressed': 'RAR Archive',
    'application/x-7z-compressed': '7Z Archive',
    'application/json': 'JSON File',
    'application/xml': 'XML File',
    'text/html': 'HTML Document',
    'text/css': 'CSS File',
    'application/javascript': 'JavaScript File',

    // Simple type names (fallback)
    pdf: 'PDF Document',
    doc: 'Word Document',
    docx: 'Word Document',
    xls: 'Excel Spreadsheet',
    xlsx: 'Excel Spreadsheet',
    ppt: 'PowerPoint Presentation',
    pptx: 'PowerPoint Presentation',
    jpg: 'JPEG',
    jpeg: 'JPEG',
    png: 'PNG',
    gif: 'GIF',
    bmp: 'BMP',
    tiff: 'TIFF',
    webp: 'WebP',
    svg: 'SVG',
    txt: 'Text Document',
    csv: 'CSV File',
    zip: 'ZIP Archive',
    rar: 'RAR Archive',
    '7z': '7Z Archive',
    json: 'JSON File',
    xml: 'XML File',
    html: 'HTML Document',
    css: 'CSS File',
    js: 'JavaScript File',
    document: 'Document',
  };

  const lowerType = type.toLowerCase().trim();

  // Check exact match first
  if (typeMap[lowerType]) {
    return typeMap[lowerType];
  }

  // Check if it contains a known type
  for (const [key, value] of Object.entries(typeMap)) {
    if (lowerType.includes(key)) {
      return value;
    }
  }

  // If no match, capitalize the first letter and return
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export function foramtPhoneNumber(phoneNo: string): string {
  // if first 2 digits is 09
  // then format it into +63 000-000-0000
  // else retain as is
  const p1: string = phoneNo.charAt(0);
  const p2: string = phoneNo.charAt(1);

  if (p1 === '0' && p2 === '9') {
    const remaining = phoneNo?.substring(1, phoneNo?.length);
    return '+63' + remaining;
  } else return phoneNo;
}
