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
  | 'admin_audit_log'
  | 'admin_users'
  | 'communications_email_outbox'
  | 'inventory_orchestration_feed'
  | 'lot_ledger_protocol'
  | 'inventory_operational_ledger'
  | 'procurement_logistics_pipeline'
  | 'generic_table';

export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'post' | 'cancel' | 'export' | 'update';


export const PERMISSION_MATRIX: Partial<Record<UserRole, Partial<Record<ResourceType, ActionType[]>>>> = {
  ADMIN: {
    grn: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    pr: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    po: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    issue: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    transfer: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    adjustment: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    stocktake: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    inventory: ['view', 'export'],
    master_data: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    admin: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    reports: ['view', 'export'],
    admin_audit_log: ['view', 'export'],
    master_data_items: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_warehouses: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_branches: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_suppliers: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_units_of_measure: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_categories: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_departments: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_currencies: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    master_data_barcodes: ['view', 'create', 'edit', 'delete', 'export', 'update'],
    procurement_grn: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    procurement_po: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    procurement_pr: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    inventory_balance: ['view', 'export'],
    inventory_lots: ['view', 'export'],
    inventory_movements: ['view', 'export'],
    operations_stocktake: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    operations_transfers: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    operations_adjustments: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
    operations_issues: ['view', 'create', 'edit', 'delete', 'approve', 'post', 'cancel', 'export', 'update'],
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
    stocktake: ['view', 'create', 'edit', 'post', 'export'],
    master_data: ['view'],
    reports: ['view', 'export'],
    master_data_items: ['view'],
    inventory_balance: ['view', 'export'],
    inventory_lots: ['view', 'export'],
    inventory_movements: ['view', 'export'],
    operations_issues: ['view', 'create', 'edit', 'post', 'export'],
    operations_transfers: ['view', 'create', 'edit', 'post', 'export'],
    operations_adjustments: ['view', 'create', 'edit', 'post', 'export'],
    operations_stocktake: ['view', 'create', 'edit', 'post', 'export'],
    procurement_grn: ['view', 'create', 'edit', 'post', 'export'],
  },
  INV_MGR: {
    inventory: ['view', 'export'],
    stocktake: ['view', 'create', 'edit', 'approve', 'post', 'export'],
    adjustment: ['view', 'create', 'edit', 'post', 'export'],
    transfer: ['view', 'create', 'edit', 'post', 'export'],
    issue: ['view', 'create', 'edit', 'post', 'export'],
    inventory_balance: ['view', 'export'],
    operations_stocktake: ['view', 'create', 'edit', 'approve', 'post', 'export'],
    operations_adjustments: ['view', 'create', 'edit', 'post', 'export'],
    operations_transfers: ['view', 'create', 'edit', 'post', 'export'],
    operations_issues: ['view', 'create', 'edit', 'post', 'export'],
    reports: ['view', 'export'],
  },
  KITCHEN_CHIEF: {
    inventory: ['view'],
    issue: ['view', 'create'],
    transfer: ['view', 'create'],
    reports: ['view'],
    inventory_balance: ['view'],
    operations_issues: ['view', 'create'],
    operations_transfers: ['view', 'create'],
  },
  PROC_OFFICER: {
    pr: ['view', 'create', 'edit', 'approve', 'export'],
    po: ['view', 'create', 'edit', 'approve', 'export'],
    grn: ['view'],
    master_data: ['view'],
    reports: ['view', 'export'],
    procurement_pr: ['view', 'create', 'edit', 'approve', 'export'],
    procurement_po: ['view', 'create', 'edit', 'approve', 'export'],
    procurement_grn: ['view'],
  },
};

