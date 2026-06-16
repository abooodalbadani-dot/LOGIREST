import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FEFOLotAllocator } from './FEFOLotAllocator';
import type { Lot } from '@/types/master-data';

vi.mock('next-intl', () => ({
 useTranslations: () => (key: string) => key,
 useLocale: () => 'en',
}));

// Mock system time to have stable tests
const MOCK_DATE = new Date('2026-04-22T12:00:00Z');

describe('FEFOLotAllocator', () => {
 beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOCK_DATE);
 });

 afterEach(() => {
  vi.useRealTimers();
 });

 const renderAllocator = (props: React.ComponentProps<typeof FEFOLotAllocator>) => {
  const res = render(<FEFOLotAllocator {...props} />);
  vi.runAllTimers();
  return res;
 };

 const mockLots: Lot[] = [
  { 
   id: 'lot-1', 
   lotNumber: 'L001', 
   expiryDate: '2026-05-01', // Near expiry
   qtyAvailable: 10,
   itemId: 'item-1',
   warehouseId: 'wh-1',
   isExpired: false,
   isNearExpiry: false
  },
  { 
   id: 'lot-2', 
   lotNumber: 'L002', 
   expiryDate: '2026-06-01', // Farther expiry
   qtyAvailable: 20,
   itemId: 'item-1',
   warehouseId: 'wh-1',
   isExpired: false,
   isNearExpiry: false
  },
  { 
   id: 'lot-expired', 
   lotNumber: 'L-EXP', 
   expiryDate: '2026-04-01', // Already expired
   qtyAvailable: 5,
   itemId: 'item-1',
   warehouseId: 'wh-1',
   isExpired: true,
   isNearExpiry: false
  }
 ];

 const assertAllocated = (current: number, total: number) => {
  const statusEl = screen.getByText(/Allocated:/i).parentElement;
  expect(statusEl?.textContent).toContain(`${current} / ${total}`);
 };

 it('allocates lots based on FEFO (earliest expiry first)', () => {
  const onAllocate = vi.fn();
  renderAllocator({
   lots: mockLots, 
   requestedQty: 15, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: onAllocate, 
   onClose: () => {}
  });

  assertAllocated(15, 15);
  
  const confirmBtn = screen.getByRole('button', { name: /confirm_allocation/i });
  fireEvent.click(confirmBtn);

  expect(onAllocate).toHaveBeenCalledWith([
   expect.objectContaining({ lotId: 'lot-1', allocatedQty: 10 }),
   expect.objectContaining({ lotId: 'lot-2', allocatedQty: 5 })
  ]);
 });

 it('handles partial stock fulfillment (requested > total available)', () => {
  renderAllocator({
   lots: mockLots, 
   requestedQty: 50, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });

  assertAllocated(30, 50);
  
  const confirmBtn = screen.getByRole('button', { name: /confirm_allocation/i });
  expect(confirmBtn).toBeDisabled();
 });

 it('allows ADMIN to allocate expired lots with override reason', () => {
  const onAllocate = vi.fn();
  renderAllocator({
   lots: mockLots, 
   requestedQty: 35, 
   uomLabel: "KG", 
   userRole: "ADMIN", 
   onAllocate: onAllocate, 
   onClose: () => {}
  });

  assertAllocated(35, 35);
  
  const confirmBtn = screen.getByRole('button', { name: /confirm_allocation/i });
  expect(confirmBtn).toBeDisabled();

  const reasonInput = screen.getByPlaceholderText(/reason/i);
  fireEvent.change(reasonInput, { target: { value: 'Urgent need' } });

  expect(confirmBtn).not.toBeDisabled();
  fireEvent.click(confirmBtn);

  expect(onAllocate).toHaveBeenCalledWith([
   expect.objectContaining({ lotId: 'lot-expired', allocatedQty: 5, overrideReason: 'Urgent need' }),
   expect.objectContaining({ lotId: 'lot-1', allocatedQty: 10 }),
   expect.objectContaining({ lotId: 'lot-2', allocatedQty: 20 })
  ]);
 });

 it('allows manual adjustment of allocated quantities', () => {
  renderAllocator({
   lots: mockLots, 
   requestedQty: 10, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });

  const inputs = screen.getAllByRole('spinbutton');
  fireEvent.change(inputs[0], { target: { value: '5' } });
  fireEvent.change(inputs[1], { target: { value: '5' } });

  assertAllocated(10, 10);
 });

 it('handles 0 quantity requested', () => {
  const onAllocate = vi.fn();
  renderAllocator({
   lots: mockLots, 
   requestedQty: 0, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: onAllocate, 
   onClose: () => {}
  });

  assertAllocated(0, 0);
  const confirmBtn = screen.getByRole('button', { name: /confirm_allocation/i });
  expect(confirmBtn).not.toBeDisabled();
  fireEvent.click(confirmBtn);
  expect(onAllocate).toHaveBeenCalledWith([]);
 });

 it('calls onClose when Cancel is clicked', () => {
  const onClose = vi.fn();
  renderAllocator({
   lots: mockLots, 
   requestedQty: 10, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: onClose
  });

  fireEvent.click(screen.getByText(/cancel/i));
  expect(onClose).toHaveBeenCalled();
 });

 it('sorts lots with null expiry dates to the end', () => {
  const lotsWithNull: Lot[] = [
   { id: 'lot-null', lotNumber: 'L-NULL', expiryDate: null, qtyAvailable: 10, itemId: 'item-1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false },
   { id: 'lot-1', lotNumber: 'L001', expiryDate: '2026-05-01', qtyAvailable: 10, itemId: 'item-1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false }
  ];
  
  renderAllocator({
   lots: lotsWithNull, 
   requestedQty: 5, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });

  // L001 should be first, L-NULL second
  const rows = screen.getAllByText(/lot/i).map(el => el.parentElement?.querySelector('span[dir="ltr"]')?.textContent);
  expect(rows[0]).toBe('L001');
  expect(rows[1]).toBe('L-NULL');
 });

 it('prevents confirmation if allocation is invalid', () => {
  const onAllocate = vi.fn();
  renderAllocator({
   lots: mockLots, 
   requestedQty: 100, // More than available (30 non-expired)
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: onAllocate, 
   onClose: () => {}
  });

  assertAllocated(30, 100);
  const confirmBtn = screen.getByRole('button', { name: /confirm_allocation/i });
  
  // Force click even if disabled to test the internal guard
  fireEvent.click(confirmBtn);
  expect(onAllocate).not.toHaveBeenCalled();
 });

 it('handles empty lots array', () => {
  renderAllocator({
   lots: [], 
   requestedQty: 10, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });

  assertAllocated(0, 10);
 });

 it('skips all lots if all are expired and user is WH_KEEPER', () => {
  const allExpired: Lot[] = [
   { id: 'e1', lotNumber: 'E1', expiryDate: '2026-01-01', qtyAvailable: 10, itemId: 'i1', warehouseId: 'wh-1', isExpired: true, isNearExpiry: false }
  ];
  renderAllocator({
   lots: allExpired, 
   requestedQty: 5, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });

  assertAllocated(0, 5);
 });

 it('covers all branches of sortLotsByFEFO', () => {
  const mixedLots: Lot[] = [
   { id: 'n1', lotNumber: 'N1', expiryDate: null, qtyAvailable: 10, itemId: 'i1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false },
   { id: 'e1', lotNumber: 'E1', expiryDate: '2026-05-01', qtyAvailable: 10, itemId: 'i1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false },
   { id: 'n2', lotNumber: 'N2', expiryDate: null, qtyAvailable: 10, itemId: 'i1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false },
   { id: 'e2', lotNumber: 'E2', expiryDate: '2026-04-01', qtyAvailable: 10, itemId: 'i1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false }
  ];
  renderAllocator({
   lots: mixedLots, 
   requestedQty: 5, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });
  // Sort order should be: E2 (April), E1 (May), then nulls
  const rows = screen.getAllByText(/lot/i).map(el => el.parentElement?.querySelector('span[dir="ltr"]')?.textContent);
  expect(rows[0]).toBe('E2');
  expect(rows[1]).toBe('E1');
  expect(rows[2]).toBe('N1');
  expect(rows[3]).toBe('N2');
 });

 it('skips lots with 0 available quantity', () => {
  const withZero: Lot[] = [
   { id: 'z1', lotNumber: 'Z1', expiryDate: '2026-10-01', qtyAvailable: 0, itemId: 'i1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false },
   { id: 'z2', lotNumber: 'Z2', expiryDate: '2026-11-01', qtyAvailable: 10, itemId: 'i1', warehouseId: 'wh-1', isExpired: false, isNearExpiry: false }
  ];
  renderAllocator({
   lots: withZero, 
   requestedQty: 5, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });
  // Should skip Z1 and allocate from Z2
  assertAllocated(5, 5);
  
  // Z1 should show 0 allocated
  const z1Input = screen.getAllByRole('spinbutton')[0];
  expect(z1Input).toHaveValue(null);
 });

 it('handles clearing an input field', () => {
  renderAllocator({
   lots: mockLots, 
   requestedQty: 10, 
   uomLabel: "KG", 
   userRole: "WH_KEEPER", 
   onAllocate: () => {}, 
   onClose: () => {}
  });

  // Find the input for L001 (lot-1)
  const lot1Input = screen.getByDisplayValue('10');
  fireEvent.change(lot1Input, { target: { value: '0' } });
  
  assertAllocated(0, 10); 
 });
});
