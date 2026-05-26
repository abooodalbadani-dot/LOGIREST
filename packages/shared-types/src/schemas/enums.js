"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOCKTAKE_STATUSES = exports.LOCK_TYPES = exports.DOCUMENT_TYPES = exports.ADJUSTMENT_REASONS = exports.ADJUSTMENT_DIRECTIONS = exports.LOT_STATUSES = exports.ROLES = void 0;
exports.ROLES = [
    'ADMIN',
    'GM',
    'INV_MGR',
    'WH_KEEPER',
    'PROC_OFFICER',
    'APPROVER',
    'AUDITOR',
    'VIEWER',
    'KITCHEN_CHIEF',
    'STORE_MGR',
];
exports.LOT_STATUSES = [
    'ACTIVE',
    'HOLD',
    'EXPIRED',
    'QUARANTINE',
];
exports.ADJUSTMENT_DIRECTIONS = ['IN', 'OUT'];
exports.ADJUSTMENT_REASONS = [
    'THEFT',
    'DAMAGE',
    'SPOILAGE',
    'CORRECTION',
    'ADMIN_OVERRIDE',
];
exports.DOCUMENT_TYPES = [
    'PURCHASE_REQUEST',
    'PURCHASE_ORDER',
    'GOODS_RECEIVED_NOTE',
    'INVENTORY_ISSUE',
    'TRANSFER',
    'ADJUSTMENT',
    'KITCHEN_REQUEST',
    'STOCKTAKE',
];
exports.LOCK_TYPES = ['STOCKTAKE', 'MANUAL'];
exports.STOCKTAKE_STATUSES = [
    'DRAFT',
    'STARTED',
    'COUNTING',
    'REVIEW',
    'APPROVED',
    'POSTED',
    'CLOSED',
    'CANCELLED',
];
//# sourceMappingURL=enums.js.map