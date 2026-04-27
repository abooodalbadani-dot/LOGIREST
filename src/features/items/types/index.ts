export interface Item {
  id: string;
  sku: string;
  nameEn: string;
  nameAr: string;
  category: 'FOOD' | 'EQUIPMENT' | 'PACKAGING' | 'SUPPLIES';
  uom: 'EA' | 'KG' | 'L' | 'BOX' | 'PACK' | 'BAG';
  minStockLevel: number;
  costPrice: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDTO {
  sku: string;
  nameEn: string;
  nameAr: string;
  category: 'FOOD' | 'EQUIPMENT' | 'PACKAGING' | 'SUPPLIES';
  uom: 'EA' | 'KG' | 'L' | 'BOX' | 'PACK' | 'BAG';
  minStockLevel: number;
  costPrice: number;
  status: 'ACTIVE' | 'INACTIVE';
}
