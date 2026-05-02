export type IssueStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface IssueLot {
 lotNumber: string;
 expiryDate: string;
 allocatedQuantity: number;
 isExpired?: boolean;
}

export interface IssueLineItem {
 id?: string;
 itemId: string;
 requestedQuantity: number;
 allocatedQuantity: number;
 lots: IssueLot[]; // FEFO-allocated lots
 notes?: string;
}

export interface Issue {
 id: string;
 issueNumber: string;
 warehouseId: string;
 departmentId: string;
 requestedBy: string;
 status: IssueStatus;
 items: IssueLineItem[];
 notes?: string;
 createdAt: string;
 updatedAt: string;
 postedAt?: string;
 postedBy?: string;
}

export interface CreateIssueDTO {
 warehouseId: string;
 departmentId: string;
 items: Omit<IssueLineItem, 'id'>[];
 notes?: string;
}
