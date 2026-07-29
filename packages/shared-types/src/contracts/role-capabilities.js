"use strict";
/**
 * Role Capabilities Contract
 * Single source of truth for per-document-type role authorization.
 * Both usePermission and canPerformActionV2 derive from this contract.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_METADATA = exports.ROLE_CAPABILITIES = void 0;
exports.canRolePerformAction = canRolePerformAction;
exports.ROLE_CAPABILITIES = {
    adjustment: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR'],
        reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR'],
        post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        edit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'],
    },
    transfer: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        ship: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        receive: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'],
    },
    issue: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'],
        submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'],
        post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF', 'BRANCH_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'],
    },
    stocktake: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        start: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        count: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        review: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'],
        approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR'],
        reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR'],
        post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'],
        close: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR'],
        recount: ['ADMIN', 'INV_MGR'],
    },
    kitchen_request: {
        create: ['ADMIN', 'BRANCH_MGR', 'STORE_MGR', 'KITCHEN_CHIEF'],
        submit: ['ADMIN', 'BRANCH_MGR', 'STORE_MGR', 'KITCHEN_CHIEF'],
        fulfill: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER'],
        cancel: ['ADMIN', 'INV_MGR', 'BRANCH_MGR', 'STORE_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR'],
    },
    pr: {
        create: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'],
        submit: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'],
        approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'],
        reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'],
        cancel: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'],
        view: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR', 'PROC_MGR'],
    },
    po: {
        create: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'],
        submit: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'],
        approve: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'],
        reject: ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'],
        cancel: ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'],
        view: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR', 'PROC_MGR'],
    },
    grn: {
        create: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'],
        submit: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR', 'BRANCH_MGR'],
        post: ['ADMIN', 'INV_MGR', 'BRANCH_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER', 'BRANCH_MGR', 'PROC_MGR'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM', 'BRANCH_MGR', 'PROC_MGR'],
    },
};
/**
 * Check if a role can perform a specific action on a document type.
 */
function canRolePerformAction(documentType, action, role) {
    if (!role)
        return false;
    const normalizedType = documentType.toLowerCase();
    const actions = exports.ROLE_CAPABILITIES[normalizedType];
    if (!actions)
        return false;
    const allowedRoles = actions[action];
    if (!allowedRoles)
        return false;
    return allowedRoles.includes(role);
}
exports.ROLE_METADATA = {
    ADMIN: {
        displayName: 'Administrator',
        description: 'Full system access with immutable security protocols',
    },
    GM: {
        displayName: 'General Manager',
        description: 'Cross-branch operational visibility and system oversight',
    },
    INV_MGR: {
        displayName: 'Inventory Manager',
        description: 'Manages stock levels, adjustments and stocktake workflows',
    },
    WH_KEEPER: {
        displayName: 'Warehouse Keeper',
        description: 'Operational execution of transfers and goods receiving',
    },
    PROC_OFFICER: {
        displayName: 'Procurement Officer',
        description: 'Handles purchase requests and order cycles',
    },
    APPROVER: {
        displayName: 'Executive Approver',
        description: 'Strategic approval authority for procurement and financial documents',
    },
    AUDITOR: {
        displayName: 'System Auditor',
        description: 'Read-only access to all modules for compliance tracking',
    },
    VIEWER: {
        displayName: 'System Viewer',
        description: 'Read-only access to basic dashboards and operational modules',
    },
    KITCHEN_CHIEF: {
        displayName: 'Kitchen Chief',
        description: 'Manages kitchen-level requests and direct consumption issues',
    },
    STORE_MGR: {
        displayName: 'Store Manager',
        description: 'Branch-level operational management and cost analysis',
    },
    BRANCH_MGR: {
        displayName: 'Branch Manager',
        description: 'Full operational and approval authority for all warehouses in a branch',
    },
    PROC_MGR: {
        displayName: 'Procurement Manager',
        description: 'Manages suppliers, FX rates, and purchase lifecycle across the organization',
    },
};
