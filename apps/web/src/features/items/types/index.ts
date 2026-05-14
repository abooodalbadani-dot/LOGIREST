import { Item as CoreItem } from '@/types/master-data';

export type Item = CoreItem;

export interface CreateItemDTO {
  code: string;
  barcode: string;
  name_ar: string;
  name_en: string;
  category_id: string;
  primary_uom_id: string;
  track_lots: boolean;
  min_stock_level: number;
  reorder_point: number;
  is_active: boolean;
}
