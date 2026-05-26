import type { UserRole } from '../rbac';
export type BaseDocumentType = 'adjustment' | 'transfer' | 'issue' | 'stocktake' | 'kitchen_request' | 'pr' | 'po' | 'grn';
export type DocumentType = BaseDocumentType | Uppercase<BaseDocumentType>;
export type CapabilityAction = 'create' | 'submit' | 'approve' | 'reject' | 'post' | 'cancel' | 'edit' | 'view' | 'export' | 'ship' | 'receive' | 'start' | 'count' | 'review' | 'close' | 'fulfill';
export declare const ROLE_CAPABILITIES: {
    readonly adjustment: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly submit: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly approve: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly reject: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly edit: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM"];
    };
    readonly transfer: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly ship: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly receive: readonly ["ADMIN", "INV_MGR", "WH_KEEPER"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM"];
    };
    readonly issue: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF"];
        readonly submit: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF"];
        readonly post: readonly ["ADMIN", "INV_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM"];
    };
    readonly stocktake: {
        readonly create: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly start: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly count: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly review: readonly ["ADMIN", "INV_MGR", "STORE_MGR"];
        readonly approve: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly reject: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR"];
        readonly close: readonly ["ADMIN", "INV_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM"];
    };
    readonly kitchen_request: {
        readonly create: readonly ["ADMIN", "KITCHEN_CHIEF", "INV_MGR", "STORE_MGR"];
        readonly submit: readonly ["ADMIN", "KITCHEN_CHIEF", "INV_MGR", "STORE_MGR"];
        readonly fulfill: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "KITCHEN_CHIEF"];
        readonly cancel: readonly ["ADMIN", "KITCHEN_CHIEF", "INV_MGR", "STORE_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
    };
    readonly pr: {
        readonly create: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR", "STORE_MGR"];
        readonly submit: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR", "STORE_MGR"];
        readonly approve: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly reject: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly cancel: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR", "STORE_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
    };
    readonly po: {
        readonly create: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR"];
        readonly submit: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR"];
        readonly approve: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly reject: readonly ["ADMIN", "APPROVER", "INV_MGR", "STORE_MGR"];
        readonly cancel: readonly ["ADMIN", "PROC_OFFICER", "INV_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
    };
    readonly grn: {
        readonly create: readonly ["ADMIN", "WH_KEEPER", "INV_MGR", "STORE_MGR"];
        readonly post: readonly ["ADMIN", "INV_MGR"];
        readonly cancel: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR"];
        readonly view: readonly ["ADMIN", "INV_MGR", "WH_KEEPER", "STORE_MGR", "APPROVER", "KITCHEN_CHIEF", "PROC_OFFICER", "AUDITOR", "GM", "VIEWER"];
        readonly export: readonly ["ADMIN", "INV_MGR", "STORE_MGR", "AUDITOR", "GM"];
    };
};
export type RoleCapabilities = typeof ROLE_CAPABILITIES;
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
