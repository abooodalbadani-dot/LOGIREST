import { MockFactory } from '../mock-factory';
import { PR_STATUS, PO_STATUS, GRN_STATUS } from '@logirest/shared-types';
import { PurchaseRequest, PurchaseOrder, GRN } from '@/types/documents';

export const initialPRs: PurchaseRequest[] = [
  MockFactory.createPR({ id: 'pr-1', document_number: 'PR-2023-001', status: PR_STATUS.DRAFT, created_by: 'Barakat Amin' }),
  MockFactory.createPR({ id: 'pr-2', document_number: 'PR-2023-002', status: PR_STATUS.APPROVED, warehouse_id: 'wh-2', created_by: 'Sarah J.' })
];

export const initialPOs: PurchaseOrder[] = [
  MockFactory.createPO({ id: 'po-1', document_number: 'PO-2023-010', status: PO_STATUS.DRAFT, created_at: '2023-10-05T10:00:00Z' }),
  MockFactory.createPO({ id: 'po-2', document_number: 'PO-2023-011', status: PO_STATUS.SUBMITTED, supplier_id: 'sup-2', created_at: '2023-10-06T10:00:00Z' })
];

export const initialGRNs: GRN[] = [
  MockFactory.createGRN({ id: 'grn-1', document_number: 'GRN-2023-001', status: GRN_STATUS.DRAFT }),
  MockFactory.createGRN({ id: 'grn-2', document_number: 'GRN-2023-002', status: GRN_STATUS.POSTED, posted_at: '2023-10-02T11:00:00Z' }),
  MockFactory.createGRN({ id: 'grn-3', document_number: 'GRN-2023-003', status: GRN_STATUS.POSTED, supplier_id: 'sup-1', currency_id: 'SAR' })
];
