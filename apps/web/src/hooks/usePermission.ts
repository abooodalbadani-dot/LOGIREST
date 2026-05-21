'use client';
import { useAuth } from '@/providers/AuthProvider';
import { ROLE_CAPABILITIES, type DocumentType, type DocumentAction, canRolePerformAction } from '@/contracts/role-capabilities';
import { PERMISSION_MATRIX, type ResourceType, type ActionType } from '@/types/rbac';

const RESOURCE_TO_DOCUMENT_TYPE: Partial<Record<ResourceType, DocumentType>> = {
  adjustment: 'adjustment',
  transfer: 'transfer',
  issue: 'issue',
  stocktake: 'stocktake',
  'operations_adjustments': 'adjustment',
  'operations_transfers': 'transfer',
  'operations_issues': 'issue',
  'operations_stocktake': 'stocktake',
  'kitchen_requests': 'kitchen_request',
  'operations_kitchen_requests': 'kitchen_request',
  pr: 'pr',
  'procurement_pr': 'pr',
  po: 'po',
  'procurement_po': 'po',
  grn: 'grn',
  'procurement_grn': 'grn',
};

const ACTION_TO_DOCUMENT_ACTION: Partial<Record<ActionType, DocumentAction>> = {
  create: 'create',
  edit: 'edit',
  delete: 'cancel',
  approve: 'approve',
  reject: 'reject',
  post: 'post',
  cancel: 'cancel',
  view: 'view',
  export: 'export',
  submit: 'submit',
  start: 'start',
  count: 'count',
  'review_variance': 'review',
  close: 'close',
  ship: 'ship',
  receive: 'receive',
  fulfill: 'fulfill',
  update: 'edit',
};

function checkCapability(role: string, action: ActionType, resource: ResourceType): boolean {
  const documentType = RESOURCE_TO_DOCUMENT_TYPE[resource];
  const documentAction = ACTION_TO_DOCUMENT_ACTION[action];

  if (documentType && documentAction) {
    return canRolePerformAction(documentType, documentAction, role as any);
  }

  return false;
}

export function usePermission(action: ActionType, resource: ResourceType): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return false;

  const capabilityResult = checkCapability(user.role, action, resource);
  if (capabilityResult) return true;

  const roleKey = user.role as keyof typeof PERMISSION_MATRIX;
  const allowed = PERMISSION_MATRIX[roleKey]?.[resource] ?? [];
  return allowed.includes(action);
}