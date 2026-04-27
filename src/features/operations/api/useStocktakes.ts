import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stocktake, StocktakeStatus, CreateStocktakeDTO, SubmitCountDTO } from '../types/stocktake';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - 86400000 * d).toISOString();

const mockStocktakes: Stocktake[] = [
  {
    id: 'stk-001',
    sessionName: 'جرد أبريل 2024 — المخزن الرئيسي',
    warehouseId: 'wh-001',
    status: 'COUNTING',
    items: [
      { id: 'si-01', itemId: 'item-tomato', itemName: 'طماطم', uom: 'KG', barcode: '6281017075090', snapshotQty: 50, lotNumber: 'LOT-T01', expiryDate: '2024-12-31' },
      { id: 'si-02', itemId: 'item-oil', itemName: 'زيت نباتي', uom: 'L', barcode: '6287012349876', snapshotQty: 30, lotNumber: 'LOT-O02', expiryDate: '2025-08-01' },
      { id: 'si-03', itemId: 'item-salt', itemName: 'ملح', uom: 'KG', barcode: '6281011234567', snapshotQty: 20, lotNumber: 'LOT-S01', expiryDate: '2025-06-01' },
    ],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: 'stk-002',
    sessionName: 'جرد مارس 2024 — المخزن الفرعي',
    warehouseId: 'wh-002',
    status: 'POSTED',
    items: [
      { id: 'si-04', itemId: 'item-cheese', itemName: 'جبن', uom: 'KG', snapshotQty: 15, countedQty: 14, variance: -1, varianceReason: 'كسر أثناء النقل', lotNumber: 'LOT-C02', expiryDate: '2025-09-15' },
    ],
    approvedBy: 'manager-1',
    approvedAt: daysAgo(10),
    postedBy: 'wh-keeper-1',
    postedAt: daysAgo(9),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(9),
  },
  {
    id: 'stk-003',
    sessionName: 'جرد يناير 2024 — المخزن الرئيسي',
    warehouseId: 'wh-001',
    status: 'DRAFT',
    items: [],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

let nextId = 4;

// Globally track locked warehouses for site-wide LockBanner use
export const LOCKED_WAREHOUSES_BY_STOCKTAKE = new Map<string, string>(
  // warehouseId -> stocktakeId
  mockStocktakes
    .filter(s => ['STARTED', 'COUNTING', 'VARIANCE'].includes(s.status))
    .map(s => [s.warehouseId, s.id])
);

export function useStocktakes() {
  return useQuery({
    queryKey: ['stocktakes'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 700));
      return [...mockStocktakes];
    },
  });
}

export function useStocktake(id: string) {
  return useQuery({
    queryKey: ['stocktakes', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const s = mockStocktakes.find((x) => x.id === id);
      if (!s) throw new Error('Stocktake not found');
      return { ...s, items: s.items.map(i => ({ ...i })) };
    },
    enabled: !!id,
  });
}

export function useCreateStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStocktakeDTO) => {
      await new Promise((r) => setTimeout(r, 800));
      const s: Stocktake = {
        id: `stk-00${nextId++}`,
        sessionName: data.sessionName,
        warehouseId: data.warehouseId,
        status: 'DRAFT',
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStocktakes.unshift(s);
      return s;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktakes'] }),
  });
}

export function useStartStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise((r) => setTimeout(r, 900));
      const idx = mockStocktakes.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error('Not found');
      const updated = { ...mockStocktakes[idx], status: 'STARTED' as StocktakeStatus, updatedAt: new Date().toISOString() };
      mockStocktakes[idx] = updated;
      LOCKED_WAREHOUSES_BY_STOCKTAKE.set(updated.warehouseId, id);
      return updated;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useBeginCounting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise((r) => setTimeout(r, 600));
      const idx = mockStocktakes.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error('Not found');
      const updated = { ...mockStocktakes[idx], status: 'COUNTING' as StocktakeStatus, updatedAt: new Date().toISOString() };
      mockStocktakes[idx] = updated;
      return updated;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useSubmitCounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: SubmitCountDTO) => {
      await new Promise((r) => setTimeout(r, 900));
      const idx = mockStocktakes.findIndex((x) => x.id === dto.stocktakeId);
      if (idx === -1) throw new Error('Not found');
      const updated = {
        ...mockStocktakes[idx],
        status: 'VARIANCE' as StocktakeStatus,
        updatedAt: new Date().toISOString(),
        items: mockStocktakes[idx].items.map((item) => {
          const count = dto.counts.find((c) => c.itemId === item.itemId);
          if (!count) return item;
          const counted = count.countedQty;
          return { ...item, countedQty: counted, variance: counted - item.snapshotQty, varianceReason: count.varianceReason };
        }),
      };
      mockStocktakes[idx] = updated;
      return updated;
    },
    onSuccess: (_, dto) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', dto.stocktakeId] });
    },
  });
}

export function useApproveStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await new Promise((r) => setTimeout(r, 700));
      const idx = mockStocktakes.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error('Not found');
      const updated = {
        ...mockStocktakes[idx],
        status: 'APPROVED' as StocktakeStatus,
        approvedBy: 'current-approver',
        approvedAt: new Date().toISOString(),
        approverComment: comment,
        updatedAt: new Date().toISOString(),
      };
      mockStocktakes[idx] = updated;
      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function usePostStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise((r) => setTimeout(r, 900));
      const idx = mockStocktakes.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error('Not found');
      const updated = {
        ...mockStocktakes[idx],
        status: 'POSTED' as StocktakeStatus,
        postedBy: 'current-user',
        postedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockStocktakes[idx] = updated;
      // Release warehouse lock
      LOCKED_WAREHOUSES_BY_STOCKTAKE.delete(updated.warehouseId);
      return updated;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}
