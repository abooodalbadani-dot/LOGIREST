'use client';

import { cn } from '@/lib/utils';

interface NumericDisplayProps {
  /** The numeric value to display */
  value: string | number | null | undefined;
  /** Additional CSS classes — appended to the base numeric styles */
  className?: string;
  /** Optional prefix rendered in document direction (e.g. currency symbol) */
  prefix?: React.ReactNode;
  /** Optional suffix rendered in document direction (e.g. unit label) */
  suffix?: React.ReactNode;
}

/**
 * NumericDisplay
 *
 * ENTERPRISE STANDARD: Renders any numeric or structured value (amounts, quantities,
 * codes, percentages) with a guaranteed Western Arabic numeral display (1, 2, 3)
 * regardless of the document's `lang="ar"` / RTL context.
 *
 * Use this for ALL static numeric data in table cells, summary cards, badges, and
 * read-only fields. Do NOT use raw JSX `{value}` for numeric data in AR locales.
 *
 * @example
 * // In a table cell
 * <NumericDisplay value={item.totalCost} prefix="SAR " />
 *
 * // In a summary card
 * <NumericDisplay value={stockLevel} suffix=" kg" className="text-xl font-bold" />
 */
export function NumericDisplay({
  value,
  className,
  prefix,
  suffix,
}: NumericDisplayProps) {
  if (value === null || value === undefined || value === '') {
    return <span className={cn('text-muted-foreground', className)}>—</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {prefix && (
        <span className="text-muted-foreground">{prefix}</span>
      )}
      <span
        dir="ltr"
        lang="en-u-nu-latn"
        className="font-sans tabular-nums"
        style={{
          unicodeBidi: 'isolate',
          fontVariantNumeric: 'lining-nums tabular-nums',
          fontFeatureSettings: '"lnum" 1, "tnum" 1',
        }}
      >
        {value}
      </span>
      {suffix && (
        <span className="text-muted-foreground">{suffix}</span>
      )}
    </span>
  );
}
