/**
 * Operational Configuration
 * Reads build-time environment variables with sensible defaults and validation.
 */

function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) return defaultValue;
  return parsed;
}

export const OPERATIONAL_CONFIG = {
  /** Days after shipping before an in-transit transfer is flagged as overdue */
  TRANSFER_OVERDUE_DAYS: parseEnvInt(process.env.NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS, 3),
} as const;