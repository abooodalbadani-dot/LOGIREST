import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

// --- Schemas ---

export const ConsumptionReportSchema = z.object({
  code: z.string(),
  name: z.string(),
  qty: z.number(),
  wh: z.string(),
  date: z.string(),
});

export const ExpiryReportSchema = z.object({
  code: z.string(),
  name: z.string(),
  lot: z.string(),
  expiry: z.string(),
  days: z.number(),
  status: z.string(),
});

export const ProcurementReportSchema = z.object({
  id: z.string(),
  supplier: z.string(),
  currency: z.string(),
  total: z.number(),
  status: z.string(),
  date: z.string(),
});

export const VarianceReportSchema = z.object({
  code: z.string(),
  name: z.string(),
  sys: z.number(),
  cnt: z.number(),
  var: z.number(),
  reason: z.string(),
});

export const ValuationReportSchema = z.object({
  code: z.string(),
  name: z.string(),
  qty: z.number(),
  cost: z.number(),
  total: z.number(),
});

export const AuditReportSchema = z.object({
  date: z.string(),
  user: z.string(),
  action: z.string(),
  entity: z.string(),
  ref: z.string(),
});

// --- Hooks ---

export function useConsumptionReport() {
  return useQuery({
    queryKey: ['reports', 'consumption'],
    queryFn: () => apiClient.get('/reports/consumption', z.array(ConsumptionReportSchema)),
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

export function useProcurementReport() {
  return useQuery({
    queryKey: ['reports', 'procurement'],
    queryFn: () => apiClient.get('/reports/procurement', z.array(ProcurementReportSchema)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVarianceReport() {
  return useQuery({
    queryKey: ['reports', 'variance'],
    queryFn: () => apiClient.get('/reports/variance', z.array(VarianceReportSchema)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useValuationReport() {
  return useQuery({
    queryKey: ['reports', 'valuation'],
    queryFn: () => apiClient.get('/reports/valuation', z.array(ValuationReportSchema)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditReport() {
  return useQuery({
    queryKey: ['reports', 'audit'],
    queryFn: () => apiClient.get('/reports/audit', z.array(AuditReportSchema)),
    staleTime: 5 * 60 * 1000,
  });
}
