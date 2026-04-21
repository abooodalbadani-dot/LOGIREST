export interface Warehouse {
  id: string;
  code: string;
  branchId: string; // Relation to Branch
  nameEn: string;
  nameAr: string;
  type: 'MAIN' | 'TRANSIT' | 'VIRTUAL';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseDTO {
  code: string;
  branchId: string;
  nameEn: string;
  nameAr: string;
  type: 'MAIN' | 'TRANSIT' | 'VIRTUAL';
  status: 'ACTIVE' | 'INACTIVE';
}
