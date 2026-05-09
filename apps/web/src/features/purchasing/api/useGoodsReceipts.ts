import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoodsReceipt, CreateGoodsReceiptDTO, GoodsReceiptLineItem } from '../types';
import { GRN_STATUS } from '@/contracts/statuses';


// Mock data
const mockGoodsReceipts: GoodsReceipt[] = [
 {
 id: 'grn-001',
 grnNumber: 'GRN-2024-001',
 poId: 'po-001',
 warehouseId: 'wh-001',
 supplierId: 'sup-001',
  status: GRN_STATUS.POSTED,
 supplierCurrency: 'USD',
 lockedExchangeRate: 3.75,
 baseTotalAmount: 7500,
 items: [
 {
 id: 'grn-li-001',
 poLineItemId: 'po-li-001',
 itemId: 'item-001',
 orderedQuantity: 100,
 receivedQuantity: 100,
 lotNumber: 'LOT-A100',
 expiryDate: '2025-12-31',
 },
 ],
 createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
 updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
 createdBy: 'user-1',
 postedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
 postedBy: 'user-1',
 },
 {
 id: 'grn-002',
 grnNumber: 'GRN-2024-002',
 poId: 'po-002',
 warehouseId: 'wh-001',
 supplierId: 'sup-002',
  status: GRN_STATUS.RECEIVED,
 supplierCurrency: 'EUR',
 items: [
 {
 id: 'grn-li-002',
 poLineItemId: 'po-li-002',
 itemId: 'item-002',
 orderedQuantity: 50,
 receivedQuantity: 50,
 lotNumber: 'LOT-B200',
 expiryDate: '2026-06-30',
 },
 {
 id: 'grn-li-003',
 poLineItemId: 'po-li-003',
 itemId: 'item-003',
 orderedQuantity: 10,
 receivedQuantity: 8, // partial
 lotNumber: 'LOT-C300',
 expiryDate: '2025-01-15',
 },
 ],
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 createdBy: 'user-1',
 },
];

let nextId = 3;

export function useGoodsReceipts() {
 return useQuery({
 queryKey: ['goods-receipts'],
 queryFn: async () => {
 // Simulate network latency
 await new Promise((resolve) => setTimeout(resolve, 800));
 return [...mockGoodsReceipts];
 },
 });
}

export function useGoodsReceipt(id: string) {
 return useQuery({
 queryKey: ['goods-receipts', id],
 queryFn: async () => {
 await new Promise((resolve) => setTimeout(resolve, 500));
 const grn = mockGoodsReceipts.find((p) => p.id === id);
 if (!grn) throw new Error('Goods Receipt not found');
 return { ...grn };
 },
 enabled: !!id,
 });
}

export function useCreateGoodsReceipt() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (data: CreateGoodsReceiptDTO) => {
 await new Promise((resolve) => setTimeout(resolve, 1000));
 
 const newGRN: GoodsReceipt = {
 id: `grn-00 ${nextId++}`,
 grnNumber: `GRN-2024-00 ${nextId}`,
 poId: data.poId,
 warehouseId: data.warehouseId,
 supplierId: data.supplierId,
  status: GRN_STATUS.RECEIVED,
 supplierCurrency: 'SAR', // Can be refined to fetch from PO
 items: data.items.map((i, idx) => ({ ...i, id: `grn-li-new- ${idx}` })),
 notes: data.notes,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 createdBy: 'user-1',
 };
 
 mockGoodsReceipts.unshift(newGRN);
 return newGRN;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
 },
 });
}

export function usePostGoodsReceipt() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async ({ id, lockedExchangeRate, baseTotalAmount }: { id: string, lockedExchangeRate: number, baseTotalAmount: number }) => {
 await new Promise((resolve) => setTimeout(resolve, 1000));
 const index = mockGoodsReceipts.findIndex((p) => p.id === id);
 if (index === -1) throw new Error('Goods Receipt not found');
 
 const updatedGRN = {
 ...mockGoodsReceipts[index],
  status: GRN_STATUS.POSTED,
 lockedExchangeRate,
 baseTotalAmount,
 postedAt: new Date().toISOString(),
 postedBy: 'user-1',
 updatedAt: new Date().toISOString(),
 };
 
 mockGoodsReceipts[index] = updatedGRN;
 return updatedGRN;
 },
 onSuccess: (_, { id }) => {
 queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
 queryClient.invalidateQueries({ queryKey: ['goods-receipts', id] });
 },
 });
}
export function useUpdateGRNLine() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async ({ grnId, item }: { grnId: string, item: GoodsReceiptLineItem }) => {
 // Simulation: no real network call
 await new Promise((resolve) => setTimeout(resolve, 300));
 return { grnId, item };
 },
 onMutate: async ({ grnId, item }) => {
 await queryClient.cancelQueries({ queryKey: ['goods-receipts', grnId] });
 const previousGRN = queryClient.getQueryData<GoodsReceipt>(['goods-receipts', grnId]);

 if (previousGRN) {
 const newItems = [...previousGRN.items];
 // Check if item already exists with this lot
 const existingIndex = newItems.findIndex(i => i.itemId === item.itemId && i.lotNumber === item.lotNumber);
 
 if (existingIndex > -1) {
 newItems[existingIndex] = {
 ...newItems[existingIndex],
 receivedQuantity: item.receivedQuantity // Or increment logic depending on caller
 };
 } else {
 newItems.push({
 ...item,
 id: `grn-li-scan- ${Date.now()}`
 });
 }

 queryClient.setQueryData(['goods-receipts', grnId], {
 ...previousGRN,
 items: newItems,
 updatedAt: new Date().toISOString()
 });
 }

 return { previousGRN };
 },
 onError: (err, { grnId }, context) => {
 if (context?.previousGRN) {
 queryClient.setQueryData(['goods-receipts', grnId], context.previousGRN);
 }
 },
 onSettled: (data, error, { grnId }) => {
 queryClient.invalidateQueries({ queryKey: ['goods-receipts', grnId] });
 },
 });
}
