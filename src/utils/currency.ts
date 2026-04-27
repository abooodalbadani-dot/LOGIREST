/**
 * Convert an amount from foreign currency to base currency.
 * @example convertToBase(100, 3.75) → 375
 */
export function convertToBase(foreignAmount: number, fxRate: number): number {
  return Math.round(foreignAmount * fxRate * 100) / 100;
}

/**
 * Format a number as currency string for display.
 * Always uses the user's locale for decimal/grouping separators.
 * The calling component wraps the output in <span dir="ltr"> in RTL context.
 */
export function formatCurrency(amount: number, currencyCode: string, locale: 'ar' | 'en'): string {
  // Use 'ar-u-nu-latn' to force Western Arabic numerals (1, 2, 3...) in Arabic locale
  const formatterLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  return new Intl.NumberFormat(formatterLocale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a plain number (qty) with locale separators.
 * Calling component wraps output in <span dir="ltr"> in RTL context.
 */
export function formatNumber(value: number, locale: 'ar' | 'en'): string {
  const formatterLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  return new Intl.NumberFormat(formatterLocale).format(value);
}
/**
 * Format a time string with standardized numerals.
 */
export function formatTime(date: Date, locale: 'ar' | 'en'): string {
  const formatterLocale = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  return date.toLocaleTimeString(formatterLocale);
}
