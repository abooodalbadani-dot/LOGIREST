import type { UserRole } from '@/providers/AuthProvider';
export type { UserRole };

export type ResourceType = 
 | 'grn' | 'pr' | 'po' | 'issue' | 'transfer' | 'adjustment' | 'stocktake' | 'inventory' | 'master_data' | 'admin' | 'reports'
 | 'master_data_items' 
 | 'master_data_warehouses'
 | 'master_data_branches'
 | 'master_data_suppliers'
 | 'master_data_units_of_measure'
 | 'master_data_categories'
 | 'master_data_departments'
 | 'master_data_currencies'
 | 'master_data_barcodes'
 | 'master_data_fx_rates'
 | 'procurement_grn'
 | 'procurement_po'
 | 'procurement_pr'
 | 'inventory_balance'
 | 'inventory_lots'
 | 'inventory_movements'
 | 'operations_stocktake'
 | 'operations_transfers'
 | 'operations_adjustments'
 | 'operations_issues'
 | 'zones' 
 | 'email_settings' 
 | 'barcode_mapping' 
 | 'admin_audit_logs'
 | 'admin_users'
 | 'audit_log'
 | 'user'
 | 'communications_email_outbox'
 | 'inventory_orchestration_feed'
 | 'lot_ledger_protocol'
 | 'inventory_operational_ledger'
 | 'procurement_logistics_pipeline'
 | 'kitchen_requests'
 | 'operations_kitchen_requests'
 | 'generic_table';

export type ActionType = 
  | 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'post' | 'cancel' | 'export' | 'update' | 'submit'
  | 'start' | 'count' | 'review_variance' | 'close' | 'ship' | 'receive' | 'fulfill' | 'reject';


export const PERMISSION_MATRIX: Partial<Record<UserRole, Partial<Record<ResourceType, ActionType[]>>>> = {
 ADMIN: {
 grn: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'submit'],
  pr: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'submit', 'reject'],
  po: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'submit', 'reject', 'fulfill'],
  issue: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
  transfer: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'ship', 'receive'],
  adjustment: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'reject'],
 stocktake: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'submit', 'start', 'count', 'review_variance', 'close'],
 kitchen_requests: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
 inventory: ['view', 'export'],
 master_data: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 admin: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 reports: ['view', 'export'],
 admin_audit_logs: ['view', 'export'],
 audit_log: ['view', 'export'],
 admin_users: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 user: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_items: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_warehouses: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_branches: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_suppliers: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_units_of_measure: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_categories: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_departments: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_currencies: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_barcodes: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 master_data_fx_rates: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 procurement_grn: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
 procurement_po: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
 procurement_pr: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
 inventory_balance: ['view', 'export'],
 inventory_lots: ['view', 'export'],
 inventory_movements: ['view', 'export'],
 operations_stocktake: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'submit', 'start', 'count', 'review_variance', 'close'],
  operations_transfers: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'ship', 'receive'],
  operations_adjustments: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'reject'],
  operations_issues: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
  operations_kitchen_requests: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update', 'reject'],
 zones: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 email_settings: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 barcode_mapping: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 generic_table: ['view', 'create', 'edit', 'delete', 'export', 'update'],
 },
 STORE_MGR: {
 grn: ['view', 'create', 'edit', 'post', 'export'],
 inventory: ['view', 'export'],
 issue: ['view', 'create', 'edit', 'post', 'export'],
 transfer: ['view', 'create', 'edit', 'post', 'export'],
 adjustment: ['view', 'create', 'edit', 'post', 'export'],
 stocktake: ['view', 'create', 'edit', 'post', 'export', 'submit', 'start', 'count'],
 master_data: ['view'],
 reports: ['view', 'export'],
 master_data_items: ['view'],
 master_data_fx_rates: ['view'],
 inventory_balance: ['view', 'export'],
 inventory_lots: ['view', 'export'],
 inventory_movements: ['view', 'export'],
 operations_issues: ['view', 'create', 'edit', 'post', 'export'],
 operations_transfers: ['view', 'create', 'edit', 'post', 'export'],
 operations_adjustments: ['view', 'create', 'edit', 'post', 'export'],
 operations_stocktake: ['view', 'create', 'edit', 'post', 'export', 'submit', 'start', 'count'],
 operations_kitchen_requests: ['view', 'create', 'edit', 'post', 'export'],
 procurement_grn: ['view', 'create', 'edit', 'post', 'export'],
 },
 INV_MGR: {
  pr: ['view', 'approve', 'reject'],
  inventory: ['view', 'export'],
  stocktake: ['view', 'create', 'edit', 'approve', 'post', 'export', 'submit', 'review_variance', 'close'],
  adjustment: ['view', 'create', 'edit', 'post', 'export', 'approve', 'reject'],
  transfer: ['view', 'create', 'edit', 'post', 'export', 'ship', 'receive'],
  issue: ['view', 'create', 'edit', 'post', 'export'],
 inventory_balance: ['view', 'export'],
  operations_stocktake: ['view', 'create', 'edit', 'approve', 'post', 'export', 'submit', 'review_variance', 'close'],
  operations_adjustments: ['view', 'create', 'edit', 'post', 'export', 'approve', 'reject'],
  operations_transfers: ['view', 'create', 'edit', 'post', 'export', 'ship', 'receive'],
  operations_issues: ['view', 'create', 'edit', 'post', 'export'],
 reports: ['view', 'export'],
 master_data_fx_rates: ['view'],
 },
 KITCHEN_CHIEF: {
 inventory: ['view'],
 issue: ['view', 'create'],
 transfer: ['view', 'create'],
 reports: ['view'],
 inventory_balance: ['view'],
 operations_issues: ['view', 'create'],
 operations_transfers: ['view', 'create'],
 operations_kitchen_requests: ['view', 'create'],
 },
 PROC_OFFICER: {
 pr: ['view', 'create', 'edit', 'approve', 'export', 'submit'],
 po: ['view', 'create', 'edit', 'approve', 'export', 'submit'],
 grn: ['view'],
 issue: ['view'],
 master_data: ['view'],
 reports: ['view', 'export'],
 procurement_pr: ['view', 'create', 'edit', 'approve', 'export', 'submit'],
 procurement_po: ['view', 'create', 'edit', 'approve', 'export', 'submit'],
 procurement_grn: ['view'],
 master_data_fx_rates: ['view'],
 },
 AUDITOR: {
 grn: ['view'],
 pr: ['view'],
 po: ['view'],
 issue: ['view'],
 transfer: ['view'],
 adjustment: ['view'],
 stocktake: ['view'],
 inventory: ['view', 'export'],
 reports: ['view', 'export'],
 },
 WH_KEEPER: {
  grn: ['view', 'create', 'edit'],
  issue: ['view', 'create', 'edit'],
  transfer: ['view', 'create', 'edit'],
  stocktake: ['view', 'create', 'edit', 'count', 'start', 'submit'],
  inventory: ['view'],
  adjustment: ['view', 'create', 'edit', 'submit'],
  operations_stocktake: ['view', 'create', 'edit', 'count', 'start', 'submit'],
  operations_issues: ['view', 'create', 'edit', 'submit'],
  operations_transfers: ['view', 'create', 'edit', 'ship', 'receive'],
  operations_adjustments: ['view', 'create', 'edit', 'submit'],
  },
  APPROVER: {
  grn: ['view'],
  pr: ['view', 'approve', 'reject'],
  po: ['view', 'approve', 'reject'],
  stocktake: ['view', 'approve', 'reject'],
  adjustment: ['view', 'approve', 'reject'],
  issue: ['view'],
  transfer: ['view'],
  inventory: ['view'],
  reports: ['view'],
  },
  GM: {
  grn: ['view', 'export'],
  pr: ['view', 'export'],
  po: ['view', 'export'],
  issue: ['view', 'export'],
  transfer: ['view', 'export'],
  adjustment: ['view', 'export'],
  stocktake: ['view', 'export'],
  inventory: ['view', 'export'],
  reports: ['view', 'export'],
  master_data: ['view', 'export'],
  admin_audit_logs: ['view', 'export'],
  },
  VIEWER: {
  grn: ['view', 'export'],
  pr: ['view', 'export'],
  po: ['view', 'export'],
  issue: ['view', 'export'],
  transfer: ['view', 'export'],
  adjustment: ['view', 'export'],
  stocktake: ['view', 'export'],
  inventory: ['view', 'export'],
  reports: ['view', 'export'],
  master_data: ['view'],
  }
 };
