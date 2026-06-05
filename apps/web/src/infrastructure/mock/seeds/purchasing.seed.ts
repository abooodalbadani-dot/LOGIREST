import { MockFactory } from '../mock-factory';
import { PR_STATUS, PO_STATUS, GRN_STATUS } from '@logirest/shared-types';
import { PurchaseRequest, PurchaseOrder, GRN } from '@/types/documents';

export const initialPRs: PurchaseRequest[] = [
  MockFactory.createPR({ id: 'pr-1', documentNumber: 'PR-2023-001', status: PR_STATUS.DRAFT, createdBy: 'Barakat Amin' }),
  MockFactory.createPR({ id: 'pr-2', documentNumber: 'PR-2023-002', status: PR_STATUS.APPROVED, warehouseId: 'wh-2', createdBy: 'Sarah J.' })
];

export const initialPOs: PurchaseOrder[] = [
  MockFactory.createPO({ id: 'po-1', documentNumber: 'PO-2023-010', status: PO_STATUS.DRAFT, createdAt: '2023-10-05T10:00:00Z' }),
  MockFactory.createPO({ id: 'po-2', documentNumber: 'PO-2023-011', status: PO_STATUS.SUBMITTED, supplierId: 'sup-2', createdAt: '2023-10-06T10:00:00Z' })
];

export const initialGRNs: GRN[] = [
  MockFactory.createGRN({ id: 'grn-1', documentNumber: 'GRN-2023-001', status: GRN_STATUS.DRAFT }),
  MockFactory.createGRN({ id: 'grn-2', documentNumber: 'GRN-2023-002', status: GRN_STATUS.POSTED, postedAt: '2023-10-02T11:00:00Z' }),
  MockFactory.createGRN({ id: 'grn-3', documentNumber: 'GRN-2023-003', status: GRN_STATUS.POSTED, supplierId: 'sup-1', currencyId: 'SAR' })
];
