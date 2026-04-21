export interface Branch {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchDTO {
  code: string;
  nameEn: string;
  nameAr: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBranchDTO extends Partial<CreateBranchDTO> {}
