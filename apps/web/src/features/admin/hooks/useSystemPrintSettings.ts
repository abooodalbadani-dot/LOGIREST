import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export const SystemPrintSettingsSchema = z.object({
 defaultPaperSize: z.enum(['A4', '80mm', '58mm']),
 thermalShowLogo: z.boolean(),
 autoPrintOnFulfill: z.boolean(),
});

export type SystemPrintSettings = z.infer<typeof SystemPrintSettingsSchema>;

export function useSystemPrintSettings() {
 return useQuery({
  queryKey: ['settings/print'],
  queryFn: ({ signal }) =>
   apiClient.get('/settings/print', SystemPrintSettingsSchema, { signal }),
  staleTime: 5 * 60_000, // 5 minutes cache
 });
}
