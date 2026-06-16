import { Branch as CoreBranch } from '@/types/master-data';

export type Branch = CoreBranch;

export interface CreateBranchDTO {
 code: string;
 name_ar: string;
 name_en: string;
 is_active: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateBranchDTO extends Partial<CreateBranchDTO> {
 version?: number;
}
