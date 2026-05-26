"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionMapV2 = void 0;
exports.transitionMapV2 = {
    PURCHASE_REQUEST: {
        documentType: 'PURCHASE_REQUEST',
        states: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
        transitions: [
            { from: 'DRAFT', to: 'SUBMITTED', authorizedRoles: ['REQUESTER', 'MANAGER'] },
            { from: 'SUBMITTED', to: 'APPROVED', authorizedRoles: ['MANAGER', 'ADMIN'] },
            { from: 'SUBMITTED', to: 'REJECTED', authorizedRoles: ['MANAGER', 'ADMIN'], requiresReason: true },
            { from: 'DRAFT', to: 'CANCELLED', authorizedRoles: ['REQUESTER', 'MANAGER'] },
            { from: 'SUBMITTED', to: 'CANCELLED', authorizedRoles: ['REQUESTER', 'MANAGER'] }
        ]
    }
};
//# sourceMappingURL=index.js.map