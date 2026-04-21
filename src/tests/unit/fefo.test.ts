import { describe, it, expect } from 'vitest';
import { sortLotsByFEFO, isExpired, isNearExpiry } from '@/utils/fefo';

const makeLot = (expiry: string | null) => ({ 
  id: '1', item_id: '1', warehouse_id: '1', lot_number: 'L1', 
  expiry_date: expiry, qty_available: 10, is_expired: false, is_near_expiry: false 
});

describe('sortLotsByFEFO', () => {
  it('sorts oldest expiry first', () => {
    const sorted = sortLotsByFEFO([makeLot('2030-12-01'), makeLot('2025-01-01'), makeLot('2027-06-15')]);
    expect(sorted[0].expiry_date).toBe('2025-01-01');
  });
  it('puts null expiry last', () => {
    const sorted = sortLotsByFEFO([makeLot(null), makeLot('2025-01-01')]);
    expect(sorted[0].expiry_date).toBe('2025-01-01');
  });
});

describe('isExpired', () => {
  it('returns true for past dates', () => expect(isExpired('2000-01-01')).toBe(true));
  it('returns false for future dates', () => expect(isExpired('2099-01-01')).toBe(false));
  it('returns false for null', () => expect(isExpired(null)).toBe(false));
});
