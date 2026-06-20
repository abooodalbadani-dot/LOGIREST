"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPerformActionV2 = canPerformActionV2;
exports.isDocumentLocked = isDocumentLocked;
exports.isPendingStatus = isPendingStatus;
exports.isApprovedStatus = isApprovedStatus;
exports.isPostedStatus = isPostedStatus;
exports.isCompletedStatus = isCompletedStatus;
exports.getNextStatusV2 = getNextStatusV2;
const role_capabilities_1 = require("../contracts/role-capabilities");
const statuses_1 = require("../contracts/statuses");
const workflowMap = {
    'pr': {
        pending: [statuses_1.PR_STATUS.DRAFT, statuses_1.PR_STATUS.SUBMITTED, statuses_1.PR_STATUS.REJECTED],
        completed: [statuses_1.PR_STATUS.APPROVED, statuses_1.PR_STATUS.CANCELLED],
        approved: [statuses_1.PR_STATUS.APPROVED],
        posted: [],
        locked: [statuses_1.PR_STATUS.SUBMITTED, statuses_1.PR_STATUS.APPROVED, statuses_1.PR_STATUS.CANCELLED]
    },
    'po': {
        pending: [statuses_1.PO_STATUS.DRAFT, statuses_1.PO_STATUS.SUBMITTED, statuses_1.PO_STATUS.REJECTED],
        completed: [statuses_1.PO_STATUS.APPROVED, statuses_1.PO_STATUS.FULFILLED, statuses_1.PO_STATUS.PARTIAL, statuses_1.PO_STATUS.CANCELLED],
        approved: [statuses_1.PO_STATUS.APPROVED],
        posted: [],
        locked: [statuses_1.PO_STATUS.SUBMITTED, statuses_1.PO_STATUS.APPROVED, statuses_1.PO_STATUS.FULFILLED, statuses_1.PO_STATUS.PARTIAL, statuses_1.PO_STATUS.CANCELLED]
    },
    'grn': {
        pending: [statuses_1.GRN_STATUS.DRAFT, statuses_1.GRN_STATUS.RECEIVED],
        completed: [statuses_1.GRN_STATUS.POSTED, statuses_1.GRN_STATUS.CANCELLED, statuses_1.GRN_STATUS.VOIDED],
        approved: [],
        posted: [statuses_1.GRN_STATUS.POSTED],
        locked: [statuses_1.GRN_STATUS.POSTED, statuses_1.GRN_STATUS.CANCELLED, statuses_1.GRN_STATUS.VOIDED]
    },
    'transfer': {
        pending: [statuses_1.TRANSFER_STATUS.DRAFT, statuses_1.TRANSFER_STATUS.IN_TRANSIT],
        completed: [statuses_1.TRANSFER_STATUS.RECEIVED, statuses_1.TRANSFER_STATUS.CANCELLED],
        approved: [],
        posted: [],
        locked: [statuses_1.TRANSFER_STATUS.IN_TRANSIT, statuses_1.TRANSFER_STATUS.RECEIVED, statuses_1.TRANSFER_STATUS.CANCELLED]
    },
    'issue': {
        pending: [statuses_1.ISSUE_STATUS.DRAFT, statuses_1.ISSUE_STATUS.SUBMITTED],
        completed: [statuses_1.ISSUE_STATUS.POSTED, statuses_1.ISSUE_STATUS.CANCELLED, statuses_1.ISSUE_STATUS.VOIDED],
        approved: [],
        posted: [statuses_1.ISSUE_STATUS.POSTED],
        locked: [statuses_1.ISSUE_STATUS.SUBMITTED, statuses_1.ISSUE_STATUS.POSTED, statuses_1.ISSUE_STATUS.CANCELLED, statuses_1.ISSUE_STATUS.VOIDED]
    },
    'adjustment': {
        pending: [statuses_1.ADJUSTMENT_STATUS.DRAFT, statuses_1.ADJUSTMENT_STATUS.SUBMITTED, statuses_1.ADJUSTMENT_STATUS.REJECTED],
        completed: [statuses_1.ADJUSTMENT_STATUS.POSTED, statuses_1.ADJUSTMENT_STATUS.CANCELLED, statuses_1.ADJUSTMENT_STATUS.VOIDED],
        approved: [statuses_1.ADJUSTMENT_STATUS.APPROVED],
        posted: [statuses_1.ADJUSTMENT_STATUS.POSTED],
        locked: [statuses_1.ADJUSTMENT_STATUS.SUBMITTED, statuses_1.ADJUSTMENT_STATUS.APPROVED, statuses_1.ADJUSTMENT_STATUS.POSTED, statuses_1.ADJUSTMENT_STATUS.CANCELLED, statuses_1.ADJUSTMENT_STATUS.VOIDED]
    },
    'stocktake': {
        pending: [statuses_1.STOCKTAKE_STATUS.DRAFT, statuses_1.STOCKTAKE_STATUS.STARTED, statuses_1.STOCKTAKE_STATUS.COUNTING, statuses_1.STOCKTAKE_STATUS.REVIEW],
        completed: [statuses_1.STOCKTAKE_STATUS.POSTED, statuses_1.STOCKTAKE_STATUS.CLOSED, statuses_1.STOCKTAKE_STATUS.CANCELLED, statuses_1.STOCKTAKE_STATUS.VOIDED],
        approved: [statuses_1.STOCKTAKE_STATUS.APPROVED],
        posted: [statuses_1.STOCKTAKE_STATUS.POSTED],
        locked: [statuses_1.STOCKTAKE_STATUS.STARTED, statuses_1.STOCKTAKE_STATUS.COUNTING, statuses_1.STOCKTAKE_STATUS.REVIEW, statuses_1.STOCKTAKE_STATUS.APPROVED, statuses_1.STOCKTAKE_STATUS.POSTED, statuses_1.STOCKTAKE_STATUS.CLOSED, statuses_1.STOCKTAKE_STATUS.CANCELLED, statuses_1.STOCKTAKE_STATUS.VOIDED]
    },
    'kitchen_request': {
        pending: [statuses_1.KITCHEN_REQUEST_STATUS.DRAFT, statuses_1.KITCHEN_REQUEST_STATUS.SUBMITTED],
        completed: [statuses_1.KITCHEN_REQUEST_STATUS.FULFILLED, statuses_1.KITCHEN_REQUEST_STATUS.CANCELLED, statuses_1.KITCHEN_REQUEST_STATUS.VOIDED],
        approved: [],
        posted: [],
        locked: [statuses_1.KITCHEN_REQUEST_STATUS.SUBMITTED, statuses_1.KITCHEN_REQUEST_STATUS.FULFILLED, statuses_1.KITCHEN_REQUEST_STATUS.CANCELLED, statuses_1.KITCHEN_REQUEST_STATUS.VOIDED]
    }
};
const transitionMapV2 = {
    'pr': {
        [statuses_1.PR_STATUS.DRAFT]: {
            'SUBMIT': { targetStatus: statuses_1.PR_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
            'EDIT': { targetStatus: statuses_1.PR_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
            'CANCEL': { targetStatus: statuses_1.PR_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
        },
        [statuses_1.PR_STATUS.SUBMITTED]: {
            'APPROVE': { targetStatus: statuses_1.PR_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
            'REJECT': { targetStatus: statuses_1.PR_STATUS.REJECTED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
        },
        [statuses_1.PR_STATUS.APPROVED]: {
            'CONVERT_TO_PO': { targetStatus: statuses_1.PR_STATUS.APPROVED, allowedRoles: ['ADMIN', 'PROC_OFFICER'] },
        },
        [statuses_1.PR_STATUS.REJECTED]: {
            'EDIT': { targetStatus: statuses_1.PR_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
        }
    },
    'po': {
        [statuses_1.PO_STATUS.DRAFT]: {
            'SUBMIT': { targetStatus: statuses_1.PO_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
            'EDIT': { targetStatus: statuses_1.PO_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
            'CANCEL': { targetStatus: statuses_1.PO_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
        },
        [statuses_1.PO_STATUS.SUBMITTED]: {
            'APPROVE': { targetStatus: statuses_1.PO_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
            'REJECT': { targetStatus: statuses_1.PO_STATUS.REJECTED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
        },
        [statuses_1.PO_STATUS.APPROVED]: {
            'FULFILL': { targetStatus: statuses_1.PO_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
        },
        [statuses_1.PO_STATUS.PARTIAL]: {
            'FULFILL': { targetStatus: statuses_1.PO_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
        },
        [statuses_1.PO_STATUS.REJECTED]: {
            'EDIT': { targetStatus: statuses_1.PO_STATUS.DRAFT, allowedRoles: ['ADMIN', 'PROC_OFFICER', 'INV_MGR'] },
        }
    },
    'grn': {
        [statuses_1.GRN_STATUS.RECEIVED]: {
            'POST': { targetStatus: statuses_1.GRN_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR', 'PROC_OFFICER'] },
        },
        [statuses_1.GRN_STATUS.DRAFT]: {
            'EDIT': { targetStatus: statuses_1.GRN_STATUS.DRAFT, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR'] },
            'CANCEL': { targetStatus: statuses_1.GRN_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR', 'STORE_MGR'] },
        },
        [statuses_1.GRN_STATUS.POSTED]: {
            'VOID': { targetStatus: statuses_1.GRN_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
        }
    },
    'transfer': {
        [statuses_1.TRANSFER_STATUS.DRAFT]: {
            'SHIP': { targetStatus: statuses_1.TRANSFER_STATUS.IN_TRANSIT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
            'CANCEL': { targetStatus: statuses_1.TRANSFER_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
        },
        [statuses_1.TRANSFER_STATUS.IN_TRANSIT]: {
            'RECEIVE': { targetStatus: statuses_1.TRANSFER_STATUS.RECEIVED, allowedRoles: ['ADMIN', 'WH_KEEPER', 'INV_MGR'] },
        }
    },
    'issue': {
        [statuses_1.ISSUE_STATUS.DRAFT]: {
            'SUBMIT': { targetStatus: statuses_1.ISSUE_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
            'CANCEL': { targetStatus: statuses_1.ISSUE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
        },
        [statuses_1.ISSUE_STATUS.SUBMITTED]: {
            'POST': { targetStatus: statuses_1.ISSUE_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR'] },
            'CANCEL': { targetStatus: statuses_1.ISSUE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
        },
        [statuses_1.ISSUE_STATUS.POSTED]: {
            'VOID': { targetStatus: statuses_1.ISSUE_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
        }
    },
    'adjustment': {
        [statuses_1.ADJUSTMENT_STATUS.DRAFT]: {
            'SUBMIT': { targetStatus: statuses_1.ADJUSTMENT_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
            'CANCEL': { targetStatus: statuses_1.ADJUSTMENT_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
        },
        [statuses_1.ADJUSTMENT_STATUS.SUBMITTED]: {
            'APPROVE': { targetStatus: statuses_1.ADJUSTMENT_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR', 'STORE_MGR'] },
            'REJECT': { targetStatus: statuses_1.ADJUSTMENT_STATUS.REJECTED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
            'CANCEL': { targetStatus: statuses_1.ADJUSTMENT_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
        },
        [statuses_1.ADJUSTMENT_STATUS.APPROVED]: {
            'POST': { targetStatus: statuses_1.ADJUSTMENT_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR'] },
        },
        [statuses_1.ADJUSTMENT_STATUS.POSTED]: {
            'VOID': { targetStatus: statuses_1.ADJUSTMENT_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
        },
        [statuses_1.ADJUSTMENT_STATUS.REJECTED]: {
            'EDIT': { targetStatus: statuses_1.ADJUSTMENT_STATUS.DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] },
        }
    },
    'stocktake': {
        [statuses_1.STOCKTAKE_STATUS.DRAFT]: {
            'START': { targetStatus: statuses_1.STOCKTAKE_STATUS.STARTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
            'CANCEL': { targetStatus: statuses_1.STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'] },
        },
        [statuses_1.STOCKTAKE_STATUS.STARTED]: {
            'COUNT': { targetStatus: statuses_1.STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
            'SUBMIT': { targetStatus: statuses_1.STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
            'CANCEL': { targetStatus: statuses_1.STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
        },
        [statuses_1.STOCKTAKE_STATUS.COUNTING]: {
            'COUNT': { targetStatus: statuses_1.STOCKTAKE_STATUS.COUNTING, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
            'SUBMIT': { targetStatus: statuses_1.STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
            'CANCEL': { targetStatus: statuses_1.STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR', 'BRANCH_MGR'] },
        },
        [statuses_1.STOCKTAKE_STATUS.REVIEW]: {
            'REVIEW_VARIANCE': { targetStatus: statuses_1.STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'INV_MGR'] },
            'APPROVE': { targetStatus: statuses_1.STOCKTAKE_STATUS.APPROVED, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
            'REJECT': { targetStatus: statuses_1.STOCKTAKE_STATUS.REVIEW, allowedRoles: ['ADMIN', 'APPROVER', 'INV_MGR'] },
            'CANCEL': { targetStatus: statuses_1.STOCKTAKE_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR'] },
        },
        [statuses_1.STOCKTAKE_STATUS.APPROVED]: {
            'POST': { targetStatus: statuses_1.STOCKTAKE_STATUS.POSTED, allowedRoles: ['ADMIN', 'INV_MGR'] },
        },
        [statuses_1.STOCKTAKE_STATUS.POSTED]: {
            'CLOSE': { targetStatus: statuses_1.STOCKTAKE_STATUS.CLOSED, allowedRoles: ['ADMIN', 'INV_MGR'] },
            'VOID': { targetStatus: statuses_1.STOCKTAKE_STATUS.VOIDED, allowedRoles: ['ADMIN'] },
        }
    },
    'kitchen_request': {
        [statuses_1.KITCHEN_REQUEST_STATUS.DRAFT]: {
            'SUBMIT': { targetStatus: statuses_1.KITCHEN_REQUEST_STATUS.SUBMITTED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
            'CANCEL': { targetStatus: statuses_1.KITCHEN_REQUEST_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
        },
        [statuses_1.KITCHEN_REQUEST_STATUS.SUBMITTED]: {
            'FULFILL': { targetStatus: statuses_1.KITCHEN_REQUEST_STATUS.FULFILLED, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'KITCHEN_CHIEF'] },
            'CANCEL': { targetStatus: statuses_1.KITCHEN_REQUEST_STATUS.CANCELLED, allowedRoles: ['ADMIN', 'INV_MGR', 'KITCHEN_CHIEF'] },
        },
        [statuses_1.KITCHEN_REQUEST_STATUS.FULFILLED]: {
            'VOID': { targetStatus: statuses_1.KITCHEN_REQUEST_STATUS.VOIDED, allowedRoles: ['ADMIN', 'INV_MGR'] },
        }
    }
};
function canPerformActionV2(documentType, status, action, role) {
    if (!role)
        return false;
    const normalizedType = documentType.toLowerCase();
    const normalizedAction = action.toLowerCase();
    const capabilitiesKey = normalizedType === 'pr' ? 'pr'
        : normalizedType === 'po' ? 'po'
            : normalizedType === 'grn' ? 'grn'
                : normalizedType === 'kitchen_request' ? 'kitchen_request'
                    : normalizedType;
    const docCapabilities = role_capabilities_1.ROLE_CAPABILITIES[capabilitiesKey];
    if (docCapabilities) {
        const capabilityAction = normalizedAction === 'review_variance' ? 'review' : normalizedAction;
        const allowedRoles = docCapabilities[capabilityAction];
        if (allowedRoles) {
            return allowedRoles.includes(role);
        }
    }
    const typeMap = transitionMapV2[normalizedType];
    if (!typeMap) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[Workflow Engine] No transitions defined for DocumentType: ${documentType}`);
        }
        return false;
    }
    const statusTransitions = typeMap[status];
    if (!statusTransitions) {
        return false;
    }
    const rule = statusTransitions[action];
    if (!rule)
        return false;
    return rule.allowedRoles.includes(role);
}
function isDocumentLocked(type, status) {
    const normalizedType = type.toLowerCase();
    if (normalizedType in workflowMap) {
        return workflowMap[normalizedType].locked.includes(status);
    }
    return false;
}
function isPendingStatus(type, status) {
    const normalizedType = type.toLowerCase();
    if (normalizedType in workflowMap) {
        return workflowMap[normalizedType].pending.includes(status);
    }
    return false;
}
function isApprovedStatus(type, status) {
    const normalizedType = type.toLowerCase();
    if (normalizedType in workflowMap) {
        return workflowMap[normalizedType].approved.includes(status);
    }
    return false;
}
function isPostedStatus(type, status) {
    const normalizedType = type.toLowerCase();
    if (normalizedType in workflowMap) {
        return workflowMap[normalizedType].posted.includes(status);
    }
    return false;
}
function isCompletedStatus(type, status) {
    const normalizedType = type.toLowerCase();
    if (normalizedType in workflowMap) {
        return workflowMap[normalizedType].completed.includes(status);
    }
    return false;
}
function getNextStatusV2(documentType, status, action) {
    const normalizedType = documentType.toLowerCase();
    return transitionMapV2[normalizedType]?.[status]?.[action]?.targetStatus || null;
}
//# sourceMappingURL=document-engine.js.map