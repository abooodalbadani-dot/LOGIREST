import type { Lot } from '@/types/master-data';

/** Sort lots by expiry date ascending (FEFO). Null expiry goes last. */
export function sortLotsByFEFO(lots: Lot[]): Lot[] {
  return [...lots].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });
}

/** Returns true if expiryDate is in the past (UTC). */
export function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

/** Returns true if expiryDate is within `days` days from today (defaults 30). */
export function isNearExpiry(expiryDate: string | null, days = 30): boolean {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return exp <= cutoff && exp >= new Date();
}
