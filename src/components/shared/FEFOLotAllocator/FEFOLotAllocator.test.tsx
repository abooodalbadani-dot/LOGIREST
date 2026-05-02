import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FEFOLotAllocator } from './FEFOLotAllocator';
import type { Lot } from '@/types/master-data';

vi.mock('next-intl', () => ({
 useTranslations: () => (key: string) => key,
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
 lot_number: 'L001', 
 expiry_date: '2026-05-01', // Near expiry
 qty_available: 10,
 item_id: 'item-1',
 warehouse_id: 'wh-1',
 is_expired: false,
 is_near_expiry: false
 },
 { 
 id: 'lot-2', 
 lot_number: 'L002', 
 expiry_date: '2026-06-01', // Farther expiry
 qty_available: 20,
 item_id: 'item-1',
 warehouse_id: 'wh-1',
 is_expired: false,
 is_near_expiry: false
 },
 { 
 id: 'lot-expired', 
 lot_number: 'L-EXP', 
 expiry_date: '2026-04-01', // Already expired
 qty_available: 5,
 item_id: 'item-1',
 warehouse_id: 'wh-1',
 is_expired: true,
 is_near_expiry: false
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
 expect.objectContaining({ lot_id: 'lot-1', allocated_qty: 10 }),
 expect.objectContaining({ lot_id: 'lot-2', allocated_qty: 5 })
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
 expect.objectContaining({ lot_id: 'lot-expired', allocated_qty: 5, override_reason: 'Urgent need' }),
 expect.objectContaining({ lot_id: 'lot-1', allocated_qty: 10 }),
 expect.objectContaining({ lot_id: 'lot-2', allocated_qty: 20 })
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
 { id: 'lot-null', lot_number: 'L-NULL', expiry_date: null, qty_available: 10, item_id: 'item-1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false },
 { id: 'lot-1', lot_number: 'L001', expiry_date: '2026-05-01', qty_available: 10, item_id: 'item-1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false }
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
 { id: 'e1', lot_number: 'E1', expiry_date: '2026-01-01', qty_available: 10, item_id: 'i1', warehouse_id: 'wh-1', is_expired: true, is_near_expiry: false }
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
 { id: 'n1', lot_number: 'N1', expiry_date: null, qty_available: 10, item_id: 'i1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false },
 { id: 'e1', lot_number: 'E1', expiry_date: '2026-05-01', qty_available: 10, item_id: 'i1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false },
 { id: 'n2', lot_number: 'N2', expiry_date: null, qty_available: 10, item_id: 'i1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false },
 { id: 'e2', lot_number: 'E2', expiry_date: '2026-04-01', qty_available: 10, item_id: 'i1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false }
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
 { id: 'z1', lot_number: 'Z1', expiry_date: '2026-10-01', qty_available: 0, item_id: 'i1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false },
 { id: 'z2', lot_number: 'Z2', expiry_date: '2026-11-01', qty_available: 10, item_id: 'i1', warehouse_id: 'wh-1', is_expired: false, is_near_expiry: false }
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
