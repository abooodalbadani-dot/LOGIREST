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

// --- Hooks ---

export function useAvailableInventoryReport() {
 return useQuery({
 queryKey: ['reports', 'available-inventory'],
 queryFn: () => apiClient.get('/reports/available-inventory', z.array(AvailableInventoryReportSchema)),
 staleTime: 5 * 60 * 1000,
 });
}

export function useStockMovementsReport() {
 return useQuery({
 queryKey: ['reports', 'movements'],
 queryFn: () => apiClient.get('/reports/movements', z.array(StockMovementsReportSchema)),
 staleTime: 5 * 60 * 1000,
 });
}

export function useExpiryReport() {
 return useQuery({
 queryKey: ['reports', 'expiry'],
 queryFn: () => apiClient.get('/reports/expiry', z.array(ExpiryReportSchema)),
 staleTime: 5 * 60 * 1000,
 });
}

export function useStocktakeVarianceReport() {
 return useQuery({
 queryKey: ['reports', 'stocktake-variance'],
 queryFn: () => apiClient.get('/reports/stocktake-variance', z.array(StocktakeVarianceReportSchema)),
 staleTime: 5 * 60 * 1000,
 });
}

export function useProcurementStatusReport() {
 return useQuery({
 queryKey: ['reports', 'procurement-status'],
 queryFn: () => apiClient.get('/reports/procurement-status', z.array(ProcurementStatusReportSchema)),
 staleTime: 5 * 60 * 1000,
 });
}

export function useCurrencySummaryReport() {
 return useQuery({
 queryKey: ['reports', 'currency-summaries'],
 queryFn: () => apiClient.get('/reports/currency-summaries', z.array(CurrencySummaryReportSchema)),
 staleTime: 5 * 60 * 1000,
 });
}
