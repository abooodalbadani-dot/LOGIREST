import type { Warehouse, Item } from '@/types/master-data';
import type { ComboboxItem } from '@/components/shared/SmartCombobox';

/**
 * Maps a warehouse to a ComboboxItem format compatible with SmartCombobox.
 * Throws an error if the warehouse id is missing (Fail loudly).
 */
export function mapWarehouseToCombobox(warehouse: Warehouse): ComboboxItem & { name: string } {
  if (!warehouse.id) {
    throw new Error('Warehouse mapping failed: Warehouse ID is required');
  }
  return {
    id: warehouse.id,
    name: warehouse.name || '',
    code: warehouse.code,
  };
}

/**
 * Maps an item to a ComboboxItem format compatible with SmartCombobox.
 * Throws an error if the item id is missing (Fail loudly).
 */
export function mapItemToCombobox(item: Item, locale: 'ar' | 'en' = 'en'): ComboboxItem & { name: string } {
  if (!item.id) {
    throw new Error('Item mapping failed: Item ID is required');
  }
  return {
    id: item.id,
    name: locale === 'ar' ? item.nameAr : item.nameEn,
    code: item.code,
    barcode: item.barcode,
  };
}

export interface LineItemForPayload {
  itemId: string;
  qty: number;
  uomId: string;
}

/**
 * Maps frontend camelCase line items to backend snake_case payloads.
 * Throws if critical fields are missing.
 */
export function mapLineToPayload(line: LineItemForPayload) {
  if (!line.itemId) {
    throw new Error('Line mapping failed: itemId is required');
  }
  if (!line.uomId) {
    throw new Error('Line mapping failed: uomId is required');
  }
  return {
    item_id: line.itemId,
    qty: line.qty,
    uom_id: line.uomId,
  };
}
