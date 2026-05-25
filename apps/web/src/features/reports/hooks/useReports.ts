import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

// --- Schemas ---

export const AvailableInventoryReportSchema = z.object({
 sku: z.string(),
 name: z.string(),
 category: z.string(),
 qty_physical: z.number(),
 qty_reserved: z.number(),
 qty_available: z.number(),
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
 lot_no: z.string(),
 expiry_date: z.string(),
 days_remaining: z.number(),
 status: z.string(),
});

export const StocktakeVarianceReportSchema = z.object({
 sku: z.string(),
 name: z.string(),
 system_qty: z.number(),
 counted_qty: z.number(),
 variance: z.number(),
 reason: z.string(),
});

export const ProcurementStatusReportSchema = z.object({
 po_no: z.string(),
 date: z.string(),
 supplier: z.string(),
 currency: z.string(),
 total: z.number(),
 status: z.string(),
});

export const CurrencySummaryReportSchema = z.object({
 currency: z.string(),
 total: z.number(),
 total_base: z.number(),
 last_rate: z.number(),
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
  document_type: z.string(),
  document_number: z.string(),
  document_id: z.string(),
  item: z.string(),
  quantity: z.number(),
  unit_cost: z.number(),
  new_wac: z.number(),
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
  lot_number: z.string(),
  item: z.string(),
  received_date: z.string(),
  expiry_date: z.string(),
  quantity: z.number(),
  source_document: z.string(),
  source_document_type: z.string(),
  source_document_id: z.string(),
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

export function useAvailableInventoryReport() {
 return useQuery({
 queryKey: ['reports', 'available-inventory'],
 queryFn: ({ signal }) => apiClient.get('/reports/available-inventory', z.array(AvailableInventoryReportSchema), { signal }),
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
