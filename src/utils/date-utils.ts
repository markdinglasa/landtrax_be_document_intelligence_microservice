/**
 * Formats a date or string into 'MM/DD/YYYY hh:mm AM/PM'
 */
export function formatToUserDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (Number.isNaN(d.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');

  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const year = d.getFullYear();

  const rawHours = d.getHours();
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(d.getMinutes());

  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Detects if a string is a valid ISO date with a time component.
 * Format check: contains 'T' and 'Z' and length > 10.
 */
export function isIsoDateWithTime(dateStr: string): boolean {
  return (
    typeof dateStr === 'string' &&
    dateStr.includes('T') &&
    dateStr.includes('Z') &&
    dateStr.length > 10
  );
}

/**
 * Normalizes a date string for use in filter queries.
 * For date-only strings (YYYY-MM-DD), appends 'T23:59:59.999Z'.
 * For ISO strings with time, parses directly.
 * Includes validation to return null for invalid date strings.
 */
export function normalizeDateToFilter(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  try {
    let finalDateStr = dateStr;
    if (!isIsoDateWithTime(dateStr) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      finalDateStr = `${dateStr}T23:59:59.999Z`;
    }

    const date = new Date(finalDateStr);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
