import type { Lot } from '@/types/master-data';

/** Sort lots by expiry date ascending (FEFO). Null expiry goes last. */
export function sortLotsByFEFO(lots: Lot[]): Lot[] {
 return [...lots].sort((a, b) => {
 if (!a.expiry_date && !b.expiry_date) return 0;
 if (!a.expiry_date) return 1;
 if (!b.expiry_date) return -1;
 return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
 });
}

/** Returns true if expiry_date is in the past (UTC). */
export function isExpired(expiry_date: string | null): boolean {
 if (!expiry_date) return false;
 return new Date(expiry_date) < new Date();
}

/** Returns true if expiry_date is within `days` days from today (defaults 30). */
export function isNearExpiry(expiry_date: string | null, days = 30): boolean {
 if (!expiry_date) return false;
 const exp = new Date(expiry_date);
 const cutoff = new Date();
 cutoff.setDate(cutoff.getDate() + days);
 return exp <= cutoff && exp >= new Date();
}
