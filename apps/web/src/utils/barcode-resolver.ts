import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const BarcodeItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  image: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  primaryUom: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string().optional(),
  }).optional().nullable(),
  uomId: z.string().optional(),
  barcode: z.string().optional(),
  barcodeMappings: z.array(z.object({
    barcode: z.string(),
    uomId: z.string().nullable().optional(),
  })).optional().default([]),
  uomConversions: z.array(z.object({
    fromUomId: z.string(),
    toUomId: z.string(),
    factor: z.coerce.number(),
  })).optional().default([]),
  minStockLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  lastPurchasePrice: z.number().optional(),
});

export type ResolvedBarcodeItem = z.infer<typeof BarcodeItemSchema>;

export interface BarcodeResolutionResult {
  item: ResolvedBarcodeItem;
  uomId: string;
  matchedBarcode: string;
}

/**
 * Resolves a scanned barcode string into item details and its specific mapped UOM.
 * If the barcode mapping specifies a uomId, that uomId is returned.
 * Otherwise, it falls back to the item's primary UOM.
 */
export async function resolveBarcodeAndUom(
  barcode: string,
  localItemsList?: ResolvedBarcodeItem[],
  abortSignal?: AbortSignal,
): Promise<BarcodeResolutionResult | null> {
  const clean = barcode.trim().toLowerCase();
  if (!clean) return null;

  // 1. Try local list if available
  if (localItemsList && localItemsList.length > 0) {
    for (const item of localItemsList) {
      const matchedBm = item.barcodeMappings?.find(bm => bm.barcode.toLowerCase() === clean);
      if (matchedBm) {
        return {
          item,
          uomId: matchedBm.uomId || item.primaryUom?.id || item.uomId || '',
          matchedBarcode: clean,
        };
      }
      if (item.code?.toLowerCase() === clean || item.barcode?.toLowerCase() === clean) {
        return {
          item,
          uomId: item.primaryUom?.id || item.uomId || '',
          matchedBarcode: clean,
        };
      }
    }
  }

  // 2. Fetch from API
  const SearchResponseSchema = z.object({
    data: z.array(BarcodeItemSchema),
  });

  try {
    let res = await apiClient.get(
      `/master-data/items?barcode=${encodeURIComponent(clean)}`,
      SearchResponseSchema,
      { signal: abortSignal },
    );

    if (!res.data || res.data.length === 0) {
      res = await apiClient.get(
        `/items?search=${encodeURIComponent(clean)}`,
        SearchResponseSchema,
        { signal: abortSignal },
      );
    }

    if (!res.data || res.data.length === 0) {
      res = await apiClient.get(
        `/items?barcode=${encodeURIComponent(clean)}`,
        SearchResponseSchema,
        { signal: abortSignal },
      );
    }

    if (res.data && res.data.length > 0) {
      const item = res.data[0];
      const matchedBm = item.barcodeMappings?.find(bm => bm.barcode.toLowerCase() === clean);
      const uomId = matchedBm?.uomId || item.primaryUom?.id || item.uomId || '';
      return {
        item,
        uomId,
        matchedBarcode: clean,
      };
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    console.error('[resolveBarcodeAndUom] Error looking up barcode:', err);
  }

  return null;
}
