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
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value);
}
