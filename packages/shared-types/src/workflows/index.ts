export interface StateTransition {
  from: string;
  to: string;
  authorizedRoles: string[];
  requiresReason?: boolean;
}

export interface WorkflowMap {
  documentType: string;
  states: string[];
  transitions: StateTransition[];
}

export const transitionMapV2: Record<string, WorkflowMap> = {
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
