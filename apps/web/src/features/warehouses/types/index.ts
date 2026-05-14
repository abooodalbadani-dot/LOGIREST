import { Warehouse as CoreWarehouse } from '@/types/master-data';

export type Warehouse = CoreWarehouse;

export interface CreateWarehouseDTO {
  code: string;
  branch_id: string;
  name_ar: string;
  name_en: string;
  type: Warehouse['type'];
  is_active: boolean;
}
