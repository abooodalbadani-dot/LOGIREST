import { getConversionFactor, toBaseQty, type UomConversionEntry } from '@logirest/shared-types';

export interface UomOption {
  id: string;
  code: string;
  name?: string;
}

export interface ItemUomMeta {
  primaryUom?: { id?: string; code?: string; name?: string } | null;
  primary_uom?: { id?: string; code?: string; name?: string } | null;
  unitOfMeasure?: { id?: string; code?: string; name?: string } | null;
  unit_of_measure?: { id?: string; code?: string; name?: string } | null;
  uomConversions?: Array<{
    fromUomId?: string;
    from_uom_id?: string;
    fromUomCode?: string;
    fromUomName?: string;
    toUomId?: string;
    to_uom_id?: string;
    toUomCode?: string;
    toUomName?: string;
    factor?: number | unknown;
  }> | null;
  uom_conversions?: Array<{
    fromUomId?: string;
    from_uom_id?: string;
    fromUomCode?: string;
    fromUomName?: string;
    toUomId?: string;
    to_uom_id?: string;
    toUomCode?: string;
    toUomName?: string;
    factor?: number | unknown;
  }> | null;
}

/** Helper to detect if a string is a raw UUID / database hex ID */
export function isRawUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ||
    /^[0-9a-f]{24}$/i.test(str) ||
    (str.length > 20 && !str.includes(' '));
}

/**
 * Returns clean list of all available UOM options for an item (primary + conversions).
 */
export function getAvailableUomsForItem(item?: ItemUomMeta | null): UomOption[] {
  if (!item) return [];
  const options: UomOption[] = [];

  const primary = item.primaryUom || item.primary_uom || item.unitOfMeasure || item.unit_of_measure;
  if (primary && primary.id) {
    const code = (!isRawUuid(primary.code) && primary.code) ? primary.code : 'UOM';
    options.push({
      id: primary.id,
      code,
      name: primary.name || code,
    });
  }

  const conversions = item.uomConversions || item.uom_conversions;
  if (Array.isArray(conversions)) {
    for (const c of conversions) {
      const fromId = c.fromUomId || c.from_uom_id;
      const fromCode = c.fromUomCode || fromId;
      const fromName = c.fromUomName || fromCode;
      if (fromId && !options.some((o) => o.id === fromId)) {
        const cleanCode = !isRawUuid(fromCode) ? (fromCode || fromId) : 'UOM';
        options.push({ id: fromId, code: cleanCode, name: fromName || cleanCode });
      }

      const toId = c.toUomId || c.to_uom_id;
      const toCode = c.toUomCode || toId;
      const toName = c.toUomName || toCode;
      if (toId && !options.some((o) => o.id === toId)) {
        const cleanCode = !isRawUuid(toCode) ? (toCode || toId) : 'UNIT';
        options.push({ id: toId, code: cleanCode, name: toName || cleanCode });
      }
    }
  }

  return options;
}

/**
 * Resolves a human-readable UOM code for a given uomId.
 * GUARANTEED to NEVER return a raw UUID string.
 */
export function resolveUomCode(
  uomId?: string | null,
  item?: ItemUomMeta | null,
  masterUoms?: Array<{ id: string; code: string; name?: string }> | null,
  fallback = 'UOM',
): string {
  const safeFallback = isRawUuid(fallback) ? 'UOM' : (fallback || 'UOM');
  if (!uomId) {
    const primary = item?.primaryUom || item?.primary_uom || item?.unitOfMeasure || item?.unit_of_measure;
    if (primary?.code && !isRawUuid(primary.code)) return primary.code;
    return safeFallback;
  }

  // 1. If uomId itself is a clean short code (e.g. 'PCS', 'KG', 'BOX'), return it
  if (!isRawUuid(uomId) && uomId.trim() !== '') {
    return uomId;
  }

  // 2. Check primaryUom by ID
  const primary = item?.primaryUom || item?.primary_uom || item?.unitOfMeasure || item?.unit_of_measure;
  if (primary && primary.code && !isRawUuid(primary.code)) {
    if (primary.id && primary.id === uomId) {
      return primary.code;
    }
  }

  // 3. Check available UOM options from item (conversions)
  const options = getAvailableUomsForItem(item);
  const foundInOptions = options.find((o) => o.id === uomId);
  if (foundInOptions && foundInOptions.code && !isRawUuid(foundInOptions.code)) {
    return foundInOptions.code;
  }

  // 4. Check master UOMs list
  if (Array.isArray(masterUoms)) {
    const foundMaster = masterUoms.find((m) => m.id === uomId);
    if (foundMaster && foundMaster.code && !isRawUuid(foundMaster.code)) {
      return foundMaster.code;
    }
  }

  // 5. If item has primaryUom code, fallback to that
  if (primary?.code && !isRawUuid(primary.code)) {
    return primary.code;
  }

  return safeFallback;
}

/**
 * Handles switching UOM for a line item.
 * Decoupled ERP data-entry behavior: Quantity remains absolute as entered by user, only uomId is updated.
 */
export function handleUomChange<T extends { uomId?: string; qty?: number; baseQty?: number; quantity?: number }>(
  currentLine: T,
  newUomId: string,
  _baseUomId?: string,
  _conversions?: UomConversionEntry[],
): T {
  return {
    ...currentLine,
    uomId: newUomId,
  };
}

/**
 * Calculates scaled "Qty Before" in terms of the selected UOM.
 * Formula: DisplayQtyBefore = BaseStockQty / ConversionFactor
 * Where ConversionFactor = getConversionFactor(selectedUomId, primaryBaseUomId, conversions)
 */
export function getScaledQtyBefore(
  rawQtyBefore: number | undefined | null,
  selectedUomId: string | undefined | null,
  item?: ItemUomMeta | null,
  masterItems?: Array<{ id: string; code?: string; primaryUom?: { id?: string; code?: string } | null; uomConversions?: Array<{ fromUomId?: string; toUomId?: string; factor?: number | unknown }> | null }> | null,
): number {
  let baseQty = Number(rawQtyBefore ?? 0);
  if (baseQty === 0) return 0;

  // Eliminate tiny floating-point conversion artifacts (e.g. 50.0004 -> 50, 49.9996 -> 50)
  if (Math.abs(baseQty - Math.round(baseQty)) < 0.001) {
    baseQty = Math.round(baseQty);
  }

  if (!selectedUomId) return baseQty;

  const primary = item?.primaryUom || item?.primary_uom || item?.unitOfMeasure || item?.unit_of_measure;
  const primaryUomId = primary?.id || '';
  const primaryUomCode = primary?.code || '';

  // Look up item in masterItems if needed for conversions
  const matchedMaster = Array.isArray(masterItems)
    ? masterItems.find((i) => (item && 'id' in item && i.id === (item as { id: string }).id) || (item && 'code' in item && i.code === (item as { code: string }).code))
    : null;

  const baseUomId = primaryUomId || matchedMaster?.primaryUom?.id || '';
  const baseUomCode = primaryUomCode || matchedMaster?.primaryUom?.code || '';

  // Check if selectedUomId is the base UOM (either by ID or by Code)
  if (
    !baseUomId ||
    selectedUomId === baseUomId ||
    (baseUomCode && selectedUomId.trim().toLowerCase() === baseUomCode.trim().toLowerCase())
  ) {
    return baseQty;
  }

  const rawConversions = item?.uomConversions || item?.uom_conversions || matchedMaster?.uomConversions || [];
  const conversions: UomConversionEntry[] = (rawConversions || []).map((c) => ({
    fromUomId: c.fromUomId || (c as { from_uom_id?: string }).from_uom_id || (c as { fromUomCode?: string }).fromUomCode || '',
    toUomId: c.toUomId || (c as { to_uom_id?: string }).to_uom_id || (c as { toUomCode?: string }).toUomCode || '',
    factor: typeof c.factor === 'number' ? c.factor : Number(c.factor) || 1,
    fromUomCode: (c as { fromUomCode?: string }).fromUomCode,
    toUomCode: (c as { toUomCode?: string }).toUomCode,
  }));

  const factor = getConversionFactor(selectedUomId, baseUomId, conversions);
  if (!factor || factor <= 0 || factor === 1) return baseQty;

  const scaled = baseQty / factor;
  const finalVal = Math.round(scaled * 10000) / 10000;
  if (Math.abs(finalVal - Math.round(finalVal)) < 0.001) {
    return Math.round(finalVal);
  }
  return finalVal;
}



