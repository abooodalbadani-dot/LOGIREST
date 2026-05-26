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
export declare const transitionMapV2: Record<string, WorkflowMap>;
