/**
 * Convert an amount from foreign currency to base currency.
 * @example convertToBase(100, 3.75) → 375
 */
export function convertToBase(foreignAmount: number | null | undefined, fxRate: number | null | undefined): number {
  if (foreignAmount == null || fxRate == null || isNaN(foreignAmount) || isNaN(fxRate)) return 0;
  return Math.round(foreignAmount * fxRate * 100) / 100;
}

/**
 * Format a number as currency string for display.
 * Always uses the user's locale for decimal/grouping separators.
 * The calling component wraps the output in <span dir="ltr"> in RTL context.
 */
export function formatCurrency(
  amount: number | null | undefined, 
  currencyCode?: string | null, 
  locale: 'ar' | 'en' = 'en'
): string {
  const safeAmount = amount == null || isNaN(amount) ? 0 : amount;
  const safeCode = (currencyCode && currencyCode.length === 3) ? currencyCode.toUpperCase() : 'USD';
  const safeLocale = locale || 'en';
  
  // Use 'ar-u-nu-latn' to force Western Arabic numerals (1, 2, 3...) in Arabic locale
  const formatterLocale = safeLocale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  
  try {
    return new Intl.NumberFormat(formatterLocale, {
      style: 'currency',
      currency: safeCode,
      minimumFractionDigits: 2,
    }).format(safeAmount);
  } catch (e) {
    console.error(`[formatCurrency] Error with currency: ${currencyCode}`, e);
    // Ultimate safety net: format as standard number and append the raw string safely
    const formattedNum = new Intl.NumberFormat(formatterLocale, {
      minimumFractionDigits: 2,
    }).format(safeAmount);
    return `${formattedNum} ${currencyCode ? currencyCode.substring(0, 3) : ''}`;
  }
}

/**
 * Format a plain number with locale separators.
 */
export function formatNumber(
  value: number | null | undefined, 
  locale: 'ar' | 'en' = 'en', 
  precision?: number
): string {
  const safeValue = value == null || isNaN(value) ? 0 : value;
  const safeLocale = locale || 'en';
  const formatterLocale = safeLocale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  
  const options: Intl.NumberFormatOptions = {};
  if (precision !== undefined) {
    options.minimumFractionDigits = precision;
    options.maximumFractionDigits = precision;
  }
  
  return new Intl.NumberFormat(formatterLocale, options).format(safeValue);
}

/**
 * Format a quantity with ERP standard 3-decimal precision.
 */
export function formatQuantity(value: number | null | undefined, locale: 'ar' | 'en' = 'en'): string {
  return formatNumber(value, locale, 3);
}

/**
 * Format an exchange rate with high precision (default 4 decimals).
 */
export function formatRate(value: number | null | undefined, locale: 'ar' | 'en' = 'en', precision: number = 4): string {
  return formatNumber(value, locale, precision);
}

/**
 * Format a date string with standardized locale (Date only: YYYY-MM-DD).
 */
export function formatDate(date: Date | string | null | undefined, locale: 'ar' | 'en' = 'en'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const safeLocale = locale || 'en';
  const formatterLocale = safeLocale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  
  return d.toLocaleDateString(formatterLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a datetime string with standardized locale (YYYY-MM-DD HH:MM).
 */
export function formatDateTime(
  date: Date | string | null | undefined, 
  locale: 'ar' | 'en' = 'en',
  includeSeconds: boolean = false
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const safeLocale = locale || 'en';
  const formatterLocale = safeLocale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  
  return d.toLocaleString(formatterLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined
  });
}

/**
 * Format a time string with standardized numerals.
 */
export function formatTime(date: Date | null | undefined, locale: 'ar' | 'en' = 'en'): string {
  if (!date) return '--:--';
  const safeLocale = locale || 'en';
  const formatterLocale = safeLocale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
  return date.toLocaleTimeString(formatterLocale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get dynamic localized display name for a currency code.
 * @example getCurrencyDisplayName('SAR', 'en') → "Saudi Riyal (SAR)"
 */
export function getCurrencyDisplayName(
  code: string | undefined | null,
  locale: 'ar' | 'en' = 'en'
): string {
  if (!code) return '';
  try {
    const formatterLocale = locale === 'ar' ? 'ar' : 'en';
    const name = new Intl.DisplayNames([formatterLocale], { type: 'currency' }).of(code);
    return name ? `${name} (${code})` : code;
  } catch (e) {
    return code;
  }
}

