import { describe, it, expect } from 'vitest';
import { convertToBase, formatCurrency, formatNumber } from '@/utils/currency';

describe('convertToBase', () => {
  it('converts 100 USD at 3.75 to 375 SAR', () => expect(convertToBase(100, 3.75)).toBe(375));
  it('rounds to 2 decimal places', () => expect(convertToBase(1, 3.333)).toBe(3.33));
  it('handles zero rate', () => expect(convertToBase(100, 0)).toBe(0));
  it('handles negative amounts', () => expect(convertToBase(-50, 3.75)).toBe(-187.5));
});

describe('formatCurrency', () => {
  it('formats USD in English', () => {
    const result = formatCurrency(100, 'USD', 'en');
    expect(result).toContain('100');
  });
  it('formats SAR in Arabic', () => {
    const result = formatCurrency(500, 'SAR', 'ar');
    expect(result).toBeTruthy();
  });
});

describe('formatNumber', () => {
  it('formats number in English', () => {
    expect(formatNumber(1234.56, 'en')).toBeTruthy();
  });
  it('formats number in Arabic', () => {
    expect(formatNumber(1234.56, 'ar')).toBeTruthy();
  });
});