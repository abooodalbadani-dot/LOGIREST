import { Supplier as CoreSupplier } from '@/types/master-data';

export interface Supplier extends CoreSupplier {
  contact_person?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
}

export interface CreateSupplierDTO {
  code: string;
  name_ar: string;
  name_en: string;
  currency_id: string;
  payment_terms: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
  is_active: boolean;
}

export interface UpdateSupplierDTO extends Partial<CreateSupplierDTO> {
  version?: number;
}
