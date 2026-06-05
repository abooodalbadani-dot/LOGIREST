import { describe, it, expect } from 'vitest';
import { sortLotsByFEFO, isExpired } from '@/utils/fefo';

const makeLot = (expiry: string | null) => ({ 
 id: '1', itemId: '1', warehouseId: '1', lotNumber: 'L1', 
 expiryDate: expiry, qtyAvailable: 10, isExpired: false, isNearExpiry: false 
});

describe('sortLotsByFEFO', () => {
 it('sorts oldest expiry first', () => {
 const sorted = sortLotsByFEFO([makeLot('2030-12-01'), makeLot('2025-01-01'), makeLot('2027-06-15')]);
 expect(sorted[0].expiryDate).toBe('2025-01-01');
 });
 it('puts null expiry last', () => {
 const sorted = sortLotsByFEFO([makeLot(null), makeLot('2025-01-01')]);
 expect(sorted[0].expiryDate).toBe('2025-01-01');
 });
});

describe('isExpired', () => {
 it('returns true for past dates', () => expect(isExpired('2000-01-01')).toBe(true));
 it('returns false for future dates', () => expect(isExpired('2099-01-01')).toBe(false));
 it('returns false for null', () => expect(isExpired(null)).toBe(false));
});
