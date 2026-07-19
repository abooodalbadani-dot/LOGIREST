'use client';
import { useAuth, type UserRole } from '@/providers/AuthProvider';
import { type DocumentType, type CapabilityAction, canRolePerformAction } from '@logirest/shared-types';
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
  'master_data_items': 'master_item',
  'master_data_categories': 'master_item',
  'master_data_units_of_measure': 'master_item',
  'master_data_barcodes': 'master_item',
  'master_data_suppliers': 'master_supplier',
  'master_data_fx_rates': 'master_supplier',
  'master_data_warehouses': 'master_org',
  'master_data_branches': 'master_org',
  'master_data_departments': 'master_org',
  'master_data_currencies': 'master_org',
  'admin_users': 'master_org',
  'user': 'master_org',
};

const ACTION_TO_DOCUMENT_ACTION: Partial<Record<ActionType, CapabilityAction>> = {
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

function checkCapability(role: UserRole, action: ActionType, resource: ResourceType): boolean {
  const documentType = RESOURCE_TO_DOCUMENT_TYPE[resource];
  const documentAction = ACTION_TO_DOCUMENT_ACTION[action];

  if (documentType && documentAction) {
    return canRolePerformAction(documentType, documentAction, role);
  }

  return false;
}

export function checkPermission(role: UserRole, action: ActionType, resource: ResourceType): boolean {
  const capabilityResult = checkCapability(role, action, resource);
  if (capabilityResult) return true;

  const roleKey = role as keyof typeof PERMISSION_MATRIX;
  const allowed = PERMISSION_MATRIX[roleKey]?.[resource] ?? [];
  return allowed.includes(action);
}

export function usePermission(action: ActionType, resource: ResourceType): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return false;

  return checkPermission(user.role, action, resource);
}