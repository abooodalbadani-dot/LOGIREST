export interface Supplier {
 id: string;
 code: string;
 nameEn: string;
 nameAr: string;
 contactPerson: string;
 email: string;
 phone: string;
 taxNumber: string;
 status: 'ACTIVE' | 'INACTIVE';
 createdAt: string;
 updatedAt: string;
}

export interface CreateSupplierDTO {
 code: string;
 nameEn: string;
 nameAr: string;
 contactPerson: string;
 email: string;
 phone: string;
 taxNumber?: string;
 status: 'ACTIVE' | 'INACTIVE';
}
