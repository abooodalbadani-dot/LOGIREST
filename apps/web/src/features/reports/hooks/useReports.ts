import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

// --- Schemas ---

export const AvailableInventoryReportSchema = z.object({
 sku: z.string(),
 name: z.string(),
 category: z.string(),
 qtyPhysical: z.number(),
 qtyReserved: z.number(),
 qtyAvailable: z.number(),
});

export const PaginatedAvailableInventorySchema = z.object({
 total: z.number(),
 page: z.number(),
 limit: z.number(),
 data: z.array(AvailableInventoryReportSchema),
});

export const StockMovementsReportSchema = z.object({
 date: z.string(),
 reference: z.string(),
 type: z.string(),
 from: z.string(),
 to: z.string(),
 item: z.string(),
 qty: z.number(),
 user: z.string(),
});

export const ExpiryReportSchema = z.object({
 sku: z.string(),
 name: z.string(),
 lotNo: z.string(),
 expiryDate: z.string(),
 daysRemaining: z.number(),
 status: z.string(),
 qtyOnHand: z.number().optional(),
});

export const StocktakeVarianceReportSchema = z.object({
 sku: z.string(),
 name: z.string(),
 systemQty: z.number(),
 countedQty: z.number(),
 variance: z.number(),
 reason: z.string(),
});

export const ProcurementStatusReportSchema = z.object({
 poNo: z.string(),
 date: z.string(),
 supplier: z.string(),
 currency: z.string(),
 total: z.number(),
 status: z.string(),
});

export const CurrencySummaryReportSchema = z.object({
 currency: z.string(),
 total: z.number(),
 totalBase: z.number(),
 lastRate: z.number(),
});

export type AvailableInventoryReport = z.infer<typeof AvailableInventoryReportSchema>;
export type StockMovementsReport = z.infer<typeof StockMovementsReportSchema>;
export type ExpiryReport = z.infer<typeof ExpiryReportSchema>;
export type StocktakeVarianceReport = z.infer<typeof StocktakeVarianceReportSchema>;
export type ProcurementStatusReport = z.infer<typeof ProcurementStatusReportSchema>;
export type CurrencySummaryReport = z.infer<typeof CurrencySummaryReportSchema>;

// --- WAC History ---

export const WacHistoryReportSchema = z.object({
  id: z.string(),
  date: z.string(),
  documentType: z.string(),
  documentNumber: z.string(),
  documentId: z.string(),
  item: z.string(),
  quantity: z.number(),
  unitCost: z.number(),
  newWac: z.number(),
});

export type WacHistoryReport = z.infer<typeof WacHistoryReportSchema>;

export function useWacHistoryReport() {
  return useQuery({
    queryKey: ['reports', 'wac-history'],
    queryFn: ({ signal }) => apiClient.get('/reports/wac-history', z.array(WacHistoryReportSchema), { signal }),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Lot Trace ---

export const LotTraceReportSchema = z.object({
  id: z.string(),
  lotNumber: z.string(),
  item: z.string(),
  receivedDate: z.string(),
  expiryDate: z.string(),
  quantity: z.number(),
  sourceDocument: z.string(),
  sourceDocumentType: z.string(),
  sourceDocumentId: z.string(),
});

export type LotTraceReport = z.infer<typeof LotTraceReportSchema>;

export function useLotTraceReport() {
  return useQuery({
    queryKey: ['reports', 'lot-trace'],
    queryFn: ({ signal }) => apiClient.get('/reports/lot-trace', z.array(LotTraceReportSchema), { signal }),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Hooks ---

export function useAvailableInventoryReport(page = 1, limit = 100, search?: string) {
 const queryParams = new URLSearchParams({
   page: page.toString(),
   limit: limit.toString(),
   ...(search ? { search } : {}),
 }).toString();
 return useQuery({
   queryKey: ['reports', 'available-inventory', page, limit, search],
   queryFn: ({ signal }) => apiClient.get(`/reports/available-inventory?${queryParams}`, PaginatedAvailableInventorySchema, { signal }),
   staleTime: 5 * 60 * 1000,
 });
}

export function useStockMovementsReport() {
 return useQuery({
 queryKey: ['reports', 'movements'],
 queryFn: ({ signal }) => apiClient.get('/reports/movements', z.array(StockMovementsReportSchema), { signal }),
 staleTime: 5 * 60 * 1000,
 });
}

export function useExpiryReport() {
 return useQuery({
 queryKey: ['reports', 'expiry'],
 queryFn: ({ signal }) => apiClient.get('/reports/expiry', z.array(ExpiryReportSchema), { signal }),
 staleTime: 5 * 60 * 1000,
 });
}

export function useStocktakeVarianceReport(sessionId?: string | null) {
  return useQuery({
    queryKey: ['reports', 'stocktake-variance', sessionId],
    queryFn: ({ signal }) => apiClient.get(`/reports/stocktake-variance?sessionId=${sessionId || ''}`, z.array(StocktakeVarianceReportSchema), { signal }),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProcurementStatusReport() {
 return useQuery({
 queryKey: ['reports', 'procurement-status'],
 queryFn: ({ signal }) => apiClient.get('/reports/procurement-status', z.array(ProcurementStatusReportSchema), { signal }),
 staleTime: 5 * 60 * 1000,
 });
}

export function useCurrencySummaryReport() {
 return useQuery({
 queryKey: ['reports', 'currency-summaries'],
 queryFn: ({ signal }) => apiClient.get('/reports/currency-summaries', z.array(CurrencySummaryReportSchema), { signal }),
 staleTime: 5 * 60 * 1000,
 });
}
