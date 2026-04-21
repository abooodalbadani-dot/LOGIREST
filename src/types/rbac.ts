import type { UserRole } from '@/providers/AuthProvider';
export type ResourceType = 'grn' | 'pr' | 'po' | 'issue' | 'transfer' | 'adjustment' | 'stocktake' | 'inventory' | 'master_data' | 'admin' | 'reports';
export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'post' | 'approve';
export type PermissionMatrix = Record<UserRole, Partial<Record<ResourceType, ActionType[]>>>;

export const PERMISSION_MATRIX: PermissionMatrix = {
  ADMIN:        { grn: ['view','create','edit','delete','post'], pr: ['view','create','edit','delete','post','approve'], po: ['view','create','edit','delete','post'], issue: ['view','create','edit','delete','post'], transfer: ['view','create','edit','delete','post'], adjustment: ['view','create','edit','delete','post','approve'], stocktake: ['view','create','edit','post'], inventory: ['view'], master_data: ['view','create','edit','delete'], admin: ['view','create','edit','delete'], reports: ['view'] },
  INV_MGR:      { grn: ['view','create','edit','post'], pr: ['view','create','edit','post','approve'], po: ['view','create','edit','post'], issue: ['view','create','edit','post'], transfer: ['view','create','edit','post'], adjustment: ['view','create','edit','post','approve'], stocktake: ['view','create','edit','post'], inventory: ['view'], master_data: ['view','create','edit'], reports: ['view'] },
  WH_KEEPER:    { grn: ['view','create','edit'], pr: ['view'], po: ['view'], issue: ['view','create','edit','post'], transfer: ['view','create','edit','post'], adjustment: ['view','create'], stocktake: ['view','create'], inventory: ['view'] },
  PROC_OFFICER: { grn: ['view','create','edit'], pr: ['view','create','edit','post'], po: ['view','create','edit'], issue: ['view'], inventory: ['view'], reports: ['view'] },
  AUDITOR:      { grn: ['view'], pr: ['view'], po: ['view'], issue: ['view'], transfer: ['view'], adjustment: ['view'], stocktake: ['view'], inventory: ['view'], reports: ['view'], admin: ['view'] },
};
