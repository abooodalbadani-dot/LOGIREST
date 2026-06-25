import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Formats a Date or UTC ISO string to a given format in the user's local/configured timezone.
 */
export function formatDate(
  dateString: Date | string | null | undefined,
  formatStr: string = 'DD/MM/YYYY HH:mm'
): string {
  if (!dateString) return '—';
  try {
    const d = typeof dateString === 'string' ? dateString : dateString.toISOString();
    // Guess the user's local timezone
    const tz = dayjs.tz.guess() || 'Asia/Shanghai';
    return dayjs.utc(d).tz(tz).format(formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}
