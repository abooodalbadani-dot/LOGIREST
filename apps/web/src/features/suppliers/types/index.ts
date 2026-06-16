import { Supplier as CoreSupplier } from '@/types/master-data';

export interface Supplier extends CoreSupplier {
 contactName?: string | null;
 contactEmail?: string | null;
 contactPhone?: string | null;
}

export interface CreateSupplierDTO {
 code: string;
 name_ar: string;
 name_en: string;
 currency_id: string;
 payment_terms: string;
 contactName?: string;
 contactEmail?: string;
 contactPhone?: string;
 is_active: boolean;
}

export interface UpdateSupplierDTO extends Partial<CreateSupplierDTO> {
 version?: number;
}
