"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_METADATA = exports.ROLE_CAPABILITIES = void 0;
exports.canRolePerformAction = canRolePerformAction;
exports.ROLE_CAPABILITIES = {
    adjustment: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        post: ['ADMIN', 'INV_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        edit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'],
    },
    transfer: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        ship: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        receive: ['ADMIN', 'INV_MGR', 'WH_KEEPER'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'],
    },
    issue: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'],
        submit: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'],
        post: ['ADMIN', 'INV_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'],
    },
    stocktake: {
        create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        start: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        count: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        review: ['ADMIN', 'INV_MGR', 'STORE_MGR'],
        approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        post: ['ADMIN', 'INV_MGR'],
        close: ['ADMIN', 'INV_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'],
    },
    kitchen_request: {
        create: ['ADMIN', 'KITCHEN_CHIEF', 'INV_MGR', 'STORE_MGR'],
        submit: ['ADMIN', 'KITCHEN_CHIEF', 'INV_MGR', 'STORE_MGR'],
        fulfill: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'KITCHEN_CHIEF'],
        cancel: ['ADMIN', 'KITCHEN_CHIEF', 'INV_MGR', 'STORE_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
    },
    pr: {
        create: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'STORE_MGR'],
        submit: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'STORE_MGR'],
        approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        cancel: ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'STORE_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
    },
    po: {
        create: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'],
        submit: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'],
        approve: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        reject: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'],
        cancel: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
    },
    grn: {
        create: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR'],
        post: ['ADMIN', 'INV_MGR'],
        cancel: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
        view: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'APPROVER', 'KITCHEN_CHIEF', 'PROC_OFFICER', 'AUDITOR', 'GM', 'VIEWER'],
        export: ['ADMIN', 'INV_MGR', 'STORE_MGR', 'AUDITOR', 'GM'],
    },
};
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
};
//# sourceMappingURL=role-capabilities.js.map