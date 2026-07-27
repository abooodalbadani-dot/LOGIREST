import { getConversionFactor, toBaseQty, type UomConversionEntry } from '@logirest/shared-types';

export interface UomOption {
  id: string;
  code: string;
  name?: string;
}

export interface ItemUomMeta {
  primaryUom?: { id?: string; code?: string; name?: string } | null;
  primary_uom?: { id?: string; code?: string; name?: string } | null;
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

  const primary = item.primaryUom || item.primary_uom;
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
  if (!uomId) return fallback;

  // 1. Check primaryUom
  const primary = item?.primaryUom || item?.primary_uom;
  if (primary && primary.id === uomId && primary.code && !isRawUuid(primary.code)) {
    return primary.code;
  }

  // 2. Check available UOM options from item
  const options = getAvailableUomsForItem(item);
  const foundInOptions = options.find((o) => o.id === uomId);
  if (foundInOptions && foundInOptions.code && !isRawUuid(foundInOptions.code)) {
    return foundInOptions.code;
  }

  // 3. Check master UOMs list
  if (Array.isArray(masterUoms)) {
    const foundMaster = masterUoms.find((m) => m.id === uomId);
    if (foundMaster && foundMaster.code && !isRawUuid(foundMaster.code)) {
      return foundMaster.code;
    }
  }

  // 4. If uomId itself is a clean short code (e.g. 'PCS', 'KG', 'BOX'), return it
  if (!isRawUuid(uomId)) {
    return uomId;
  }

  // 5. If item has primaryUom code, fallback to that
  if (primary?.code && !isRawUuid(primary.code)) {
    return primary.code;
  }

  return fallback;
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
