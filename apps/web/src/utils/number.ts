export function normalizeDigits(value: string): string {
  if (!value) return value;

  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';

  return value
    .replace(/[٠-٩]/g, d => arabicIndic.indexOf(d).toString())
    .replace(/[۰-۹]/g, d => easternArabicIndic.indexOf(d).toString())
    .replace(/[٫]/g, '.');
}

export function toSafeNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  return Number(normalizeDigits(value)) || 0;
}
