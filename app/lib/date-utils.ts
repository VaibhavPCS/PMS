/**
 * Date utility functions for consistent date handling across the app
 *
 * IMPORTANT: All dates are stored in MongoDB as UTC timestamps.
 * When displaying dates, we extract the UTC date portion to show the intended date.
 *
 * Example: If DB has "2025-11-11T18:30:00.000+00:00", we show "11/11/2025"
 */

/**
 * Format a date string to DD/MM/YYYY format using UTC date
 * @param dateString - ISO date string from the database
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatDateDDMMYYYY(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date string to YYYY-MM-DD format using UTC date (for input fields)
 * @param dateString - ISO date string from the database
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateYYYYMMDD(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to UTC midnight for storage
 * This ensures that when a user selects a date, it's stored as midnight UTC
 *
 * @param date - Date object from calendar picker
 * @returns ISO string with UTC midnight
 */
export function dateToUTCMidnight(date: Date): string {
  // Adjust for timezone offset to get UTC midnight
  const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return utcDate.toISOString();
}

/**
 * Get UTC Date object from ISO string
 * Useful for comparisons while preserving the intended date
 *
 * @param dateString - ISO date string
 * @returns Date object set to UTC midnight
 */
export function getUTCDate(dateString: string): Date {
  const date = new Date(dateString);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

/**
 * Calculate days between two dates (inclusive)
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Number of days (inclusive)
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = getUTCDate(startDate);
  const end = getUTCDate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}
