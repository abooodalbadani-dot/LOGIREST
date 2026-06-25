/**
 * Role Capabilities Contract
 * Single source of truth for per-document-type role authorization.
 * Both usePermission and canPerformActionV2 derive from this contract.
 */
import type { UserRole } from '../rbac';
export type BaseDocumentType = 'adjustment' | 'transfer' | 'issue' | 'stocktake' | 'kitchen_request' | 'pr' | 'po' | 'grn';
export type DocumentType = BaseDocumentType | Uppercase<BaseDocumentType>;
export type CapabilityAction = 'create' | 'submit' | 'approve' | 'reject' | 'post' | 'cancel' | 'edit' | 'view' | 'export' | 'ship' | 'receive' | 'start' | 'count' | 'review' | 'close' | 'fulfill' | 'recount';
export declare const ROLE_CAPABILITIES: {
    readonly adjustment: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly submit: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly approve: readonly ["ADMIN", "GM", "APPROVER", "INV_MGR", "STORE_MGR", "BRANCH_MGR"];
        readonly reject: readonly ["ADMIN", "GM", "APPROVER", "INV_MGR", "STORE_MGR", "BRANCH_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly edit: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM", "BRANCH_MGR"];
    };
    readonly transfer: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly ship: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly receive: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM", "BRANCH_MGR"];
    };
    readonly issue: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF", "BRANCH_MGR"];
        readonly submit: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF", "BRANCH_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF", "BRANCH_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM", "BRANCH_MGR"];
    };
    readonly stocktake: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly start: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly count: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly review: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "BRANCH_MGR"];
        readonly approve: readonly ["ADMIN", "GM", "APPROVER", "INV_MGR", "BRANCH_MGR"];
        readonly reject: readonly ["ADMIN", "GM", "APPROVER", "INV_MGR", "BRANCH_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR"];
        readonly close: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM", "BRANCH_MGR"];
        readonly recount: readonly ["ADMIN", "INV_MGR"];
    };
    readonly kitchen_request: {
        readonly create: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR", "STORE_MGR", "WH_KEEPER", "KITCHEN_CHIEF"];
        readonly submit: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR", "STORE_MGR", "WH_KEEPER", "KITCHEN_CHIEF"];
        readonly fulfill: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR", "STORE_MGR", "WH_KEEPER"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR", "STORE_MGR", "WH_KEEPER", "KITCHEN_CHIEF"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR"];
    };
    readonly pr: {
        readonly create: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR", "BRANCH_MGR", "PROC_MGR"];
        readonly submit: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR", "BRANCH_MGR", "PROC_MGR"];
        readonly approve: readonly ["ADMIN", "GM", "APPROVER", "BRANCH_MGR", "PROC_MGR"];
        readonly reject: readonly ["ADMIN", "GM", "APPROVER", "BRANCH_MGR", "PROC_MGR"];
        readonly cancel: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR", "BRANCH_MGR", "PROC_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "APPROVER", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR", "PROC_MGR"];
    };
    readonly po: {
        readonly create: readonly ["ADMIN", "PROC_OFFICER", "PROC_MGR", "BRANCH_MGR"];
        readonly submit: readonly ["ADMIN", "PROC_OFFICER", "PROC_MGR", "BRANCH_MGR"];
        readonly approve: readonly ["ADMIN", "GM", "APPROVER", "BRANCH_MGR", "PROC_MGR"];
        readonly reject: readonly ["ADMIN", "GM", "APPROVER", "BRANCH_MGR", "PROC_MGR"];
        readonly cancel: readonly ["ADMIN", "PROC_OFFICER", "PROC_MGR", "BRANCH_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "APPROVER", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR", "PROC_MGR"];
    };
    readonly grn: {
        readonly create: readonly ["ADMIN", "WH_KEEPER", "INV_MGR", "STORE_MGR", "BRANCH_MGR"];
        readonly submit: readonly ["ADMIN", "WH_KEEPER", "INV_MGR", "STORE_MGR", "BRANCH_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR", "BRANCH_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "BRANCH_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER", "BRANCH_MGR", "PROC_MGR"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM", "BRANCH_MGR", "PROC_MGR"];
    };
};
export type RoleCapabilities = typeof ROLE_CAPABILITIES;
/**
 * Check if a role can perform a specific action on a document type.
 */
export declare function canRolePerformAction(documentType: DocumentType, action: CapabilityAction, role: UserRole | undefined): boolean;
export interface Permission {
    module: string;
    actions: {
        view: boolean;
        create: boolean;
        edit: boolean;
        approve: boolean;
        post: boolean;
    };
}
export interface RoleDescriptor {
    id: UserRole;
    displayName: string;
    description: string;
    userCount: number;
    permissions: Permission[];
}
export declare const ROLE_METADATA: Record<UserRole, {
    displayName: string;
    description: string;
}>;
