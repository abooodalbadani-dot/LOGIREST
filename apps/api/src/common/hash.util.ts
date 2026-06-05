import * as crypto from 'crypto';

/**
 * Calculates a SHA-256 integrity hash for an archive entry in a deterministic way.
 */
export function calculateArchiveHash(data: Record<string, unknown>): string {
  const cleanData: Record<string, unknown> = {};
  const keys = Object.keys(data).sort();
  for (const key of keys) {
    if (key === 'integrityHash' || key === 'integrity_hash') {
      continue;
    }
    const value = data[key];
    if (value === undefined || value === null) {
      cleanData[key] = null;
    } else if (value instanceof Date) {
      cleanData[key] = value.toISOString();
    } else if (
      value &&
      typeof value === 'object' &&
      typeof (value as any).toFixed === 'function'
    ) {
      cleanData[key] = value.toString();
    } else if (value && typeof value === 'object') {
      // For JSON fields or arrays, stringify them deterministically
      cleanData[key] = JSON.stringify(value);
    } else {
      cleanData[key] = value;
    }
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(cleanData))
    .digest('hex');
}
