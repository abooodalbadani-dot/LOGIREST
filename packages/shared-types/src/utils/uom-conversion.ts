/**
 * UOM Conversion Utilities
 *
 * Single source-of-truth for converting quantities between units of measure.
 * Imported by both frontend (React) and backend (NestJS) to guarantee identical math.
 */

export interface UomConversionEntry {
  fromUomId: string;
  toUomId: string;
  /** How many `toUom` units equal 1 `fromUom` unit (e.g. 1 BOX = 12 PCS → factor = 12) */
  factor: number;
  fromUomCode?: string;
  toUomCode?: string;
}

function isUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ||
    /^[0-9a-f]{24}$/i.test(str);
}

/**
 * Converts a quantity from a selected UOM to the item's base UOM.
 *
 * Lookup order:
 *   1. Direct:   fromUomId === selectedUomId && toUomId === baseUomId → multiply by factor
 *   2. Reverse:  toUomId === selectedUomId && fromUomId === baseUomId → divide by factor
 *   3. Fallback: no conversion found → returns qty unchanged with a warning
 *
 * @param qty           Quantity in the selected (user-facing) UOM
 * @param selectedUomId The UOM the user selected (UUID)
 * @param baseUomId     The item's primary/base UOM id (UUID)
 * @param conversions   The item's uomConversions array
 * @returns             Quantity normalized to the base UOM
 */
export function toBaseQty(
  qty: number,
  selectedUomId: string,
  baseUomId: string,
  conversions: UomConversionEntry[],
): number {
  if (!selectedUomId || !baseUomId || selectedUomId === baseUomId) return qty;

  if (!isUuid(selectedUomId) || !isUuid(baseUomId)) {
    console.warn(
      `[UOM Defense] Non-UUID argument passed to toBaseQty: selectedUomId="${selectedUomId}", baseUomId="${baseUomId}". Ensure uom.id (UUID) is passed instead of uom.code.`,
    );
  }

  // Direct: selectedUom → baseUom
  const direct = conversions.find(
    (c) =>
      (c.fromUomId === selectedUomId || (c.fromUomCode && c.fromUomCode === selectedUomId)) &&
      (c.toUomId === baseUomId || (c.toUomCode && c.toUomCode === baseUomId)),
  );
  if (direct) return qty * direct.factor;

  // Reverse: baseUom → selectedUom (invert the factor)
  const reverse = conversions.find(
    (c) =>
      (c.toUomId === selectedUomId || (c.toUomCode && c.toUomCode === selectedUomId)) &&
      (c.fromUomId === baseUomId || (c.fromUomCode && c.fromUomCode === baseUomId)),
  );
  if (reverse) return qty / reverse.factor;

  console.warn(
    `[UOM] No conversion found: ${selectedUomId} → ${baseUomId}. Returning qty unchanged.`,
  );
  return qty;
}

/**
 * Returns the multiplier needed to convert 1 unit of `selectedUomId` to `baseUomId`.
 *
 * - Same UOM          → 1
 * - Direct conversion → factor
 * - Reverse lookup    → 1 / factor
 * - No match found    → 1 (defensive, with a warning)
 *
 * Useful for recalculating displayed quantity when the user switches the UOM dropdown:
 *   displayedQty = baseQty / getConversionFactor(selectedUomId, baseUomId, conversions)
 */
export function getConversionFactor(
  selectedUomId: string,
  baseUomId: string,
  conversions: UomConversionEntry[],
): number {
  if (!selectedUomId || !baseUomId || selectedUomId === baseUomId) return 1;

  if (!isUuid(selectedUomId) || !isUuid(baseUomId)) {
    console.warn(
      `[UOM Defense] Non-UUID argument passed to getConversionFactor: selectedUomId="${selectedUomId}", baseUomId="${baseUomId}". Ensure uom.id (UUID) is passed instead of uom.code.`,
    );
  }

  const direct = conversions.find(
    (c) =>
      (c.fromUomId === selectedUomId || (c.fromUomCode && c.fromUomCode === selectedUomId)) &&
      (c.toUomId === baseUomId || (c.toUomCode && c.toUomCode === baseUomId)),
  );
  if (direct) return direct.factor;

  const reverse = conversions.find(
    (c) =>
      (c.toUomId === selectedUomId || (c.toUomCode && c.toUomCode === selectedUomId)) &&
      (c.fromUomId === baseUomId || (c.fromUomCode && c.fromUomCode === baseUomId)),
  );
  if (reverse) return 1 / reverse.factor;

  console.warn(
    `[UOM] No conversion factor found: ${selectedUomId} → ${baseUomId}. Defaulting to 1.`,
  );
  return 1;
}
