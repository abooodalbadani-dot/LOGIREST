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
  barcodes: z.array(z.object({
    barcode: z.string(),
    uomId: z.string().nullable().optional(),
    uom_id: z.string().nullable().optional(),
  })).optional().default([]),
  barcodeMappings: z.array(z.object({
    barcode: z.string(),
    uomId: z.string().nullable().optional(),
    uom_id: z.string().nullable().optional(),
  })).optional().default([]),
  barcode_mappings: z.array(z.object({
    barcode: z.string(),
    uomId: z.string().nullable().optional(),
    uom_id: z.string().nullable().optional(),
  })).optional().default([]),
  uomConversions: z.array(z.object({
    fromUomId: z.string().optional(),
    toUomId: z.string().optional(),
    factor: z.coerce.number().optional().default(1),
  })).optional().default([]),
  minStockLevel: z.number().optional(),
  reorderPoint: z.number().optional(),
  lastPurchasePrice: z.number().optional(),
}).transform((data) => {
  const rawList = (data.barcodeMappings && data.barcodeMappings.length > 0)
    ? data.barcodeMappings
    : (data.barcodes && data.barcodes.length > 0)
      ? data.barcodes
      : (data.barcode_mappings && data.barcode_mappings.length > 0)
        ? data.barcode_mappings
        : (data.barcode ? [{ barcode: data.barcode, uomId: data.primaryUom?.id || data.uomId || null }] : []);

  const normalized = rawList.map((b) => ({
    barcode: b.barcode,
    uomId: b.uomId || b.uom_id || null,
  }));

  return {
    ...data,
    barcodeMappings: normalized,
    barcodes: normalized,
  };
});

export type ResolvedBarcodeItem = z.infer<typeof BarcodeItemSchema>;

export interface BarcodeResolutionResult {
  item: ResolvedBarcodeItem;
  uomId: string;
  matchedBarcode: string;
  conversionFactor: number;
}

function getConversionFactor(item: Record<string, unknown>, uomId: string): number {
  if (!uomId) return 1;
  const primaryUomObj = item.primaryUom as { id?: string } | undefined;
  if (primaryUomObj?.id === uomId || (item.uomId as string) === uomId) {
    return 1;
  }
  const conversions = (Array.isArray(item.uomConversions) ? item.uomConversions : []) as Array<{ fromUomId?: string; toUomId?: string; factor?: number }>;
  const found = conversions.find(c => c.fromUomId === uomId || c.toUomId === uomId);
  return found?.factor && found.factor > 0 ? found.factor : 1;
}

/**
 * Resolves a scanned barcode string into item details and its specific mapped UOM.
 * If the barcode mapping specifies a uomId, that uomId is returned.
 * Otherwise, it falls back to the item's primary UOM.
 */
export async function resolveBarcodeAndUom(
  barcode: string,
  localItemsList?: unknown[],
  abortSignal?: AbortSignal,
): Promise<BarcodeResolutionResult | null> {
  const clean = barcode.trim().toLowerCase();
  if (!clean) return null;

  // 1. Try local list if available
  if (localItemsList && localItemsList.length > 0) {
    for (const rawItem of localItemsList) {
      const item = rawItem as Record<string, unknown>;
      const mappings = (
        (Array.isArray(item.barcodeMappings) && item.barcodeMappings.length > 0)
          ? item.barcodeMappings
          : (Array.isArray(item.barcodes) && item.barcodes.length > 0)
            ? item.barcodes
            : (Array.isArray(item.barcode_mappings) && item.barcode_mappings.length > 0)
              ? item.barcode_mappings
              : []
      ) as Array<{ barcode?: string; uomId?: string | null; uom_id?: string | null; uom?: { id?: string } | null }>;

      const matchedBm = mappings.find(
        (bm) => typeof bm.barcode === 'string' && bm.barcode.trim().toLowerCase() === clean
      );

      if (matchedBm) {
        const primaryUomObj = item.primaryUom as { id?: string } | undefined;
        const bmUomId = matchedBm.uomId || matchedBm.uom_id || (matchedBm.uom && typeof matchedBm.uom === 'object' ? matchedBm.uom.id : null);
        const uomId = bmUomId || primaryUomObj?.id || (item.uomId as string) || '';
        return {
          item: item as unknown as ResolvedBarcodeItem,
          uomId,
          matchedBarcode: clean,
          conversionFactor: getConversionFactor(item, uomId),
        };
      }

      const itemCode = typeof item.code === 'string' ? item.code.trim().toLowerCase() : '';
      const itemBarcode = typeof item.barcode === 'string' ? item.barcode.trim().toLowerCase() : '';
      const itemSku = typeof item.sku === 'string' ? item.sku.trim().toLowerCase() : '';

      if (itemCode === clean || itemBarcode === clean || itemSku === clean) {
        const primaryUomObj = item.primaryUom as { id?: string } | undefined;
        const uomId = primaryUomObj?.id || (item.uomId as string) || '';
        return {
          item: item as unknown as ResolvedBarcodeItem,
          uomId,
          matchedBarcode: clean,
          conversionFactor: getConversionFactor(item, uomId),
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
      const mappings = item.barcodeMappings && item.barcodeMappings.length > 0 ? item.barcodeMappings : item.barcodes;
      const matchedBm = mappings.find(bm => bm.barcode.trim().toLowerCase() === clean);
      const uomId = matchedBm?.uomId || item.primaryUom?.id || item.uomId || '';
      return {
        item,
        uomId,
        matchedBarcode: clean,
        conversionFactor: getConversionFactor(item as unknown as Record<string, unknown>, uomId),
      };
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    console.error('[resolveBarcodeAndUom] Error looking up barcode:', err);
  }

  return null;
}
