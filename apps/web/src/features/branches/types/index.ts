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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateBranchDTO extends Partial<CreateBranchDTO> {}
