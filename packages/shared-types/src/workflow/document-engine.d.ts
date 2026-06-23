/**
 * Document Workflow Engine
 * Centralized logic for document status transitions and permission checks.
 */
import { DocumentStatus } from '../contracts/statuses';
import { DocumentType } from '../contracts/role-capabilities';
import { UserRole as Role } from '../rbac';
export type { DocumentStatus, DocumentType, Role };
export type DocumentAction = 'EDIT' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'POST' | 'CANCEL' | 'VOID' | 'CONVERT_TO_PO' | 'VIEW' | 'START' | 'COUNT' | 'REVIEW_VARIANCE' | 'FULFILL' | 'DOWNLOAD_PDF' | 'INTERNAL_MOVEMENT' | 'SHIP' | 'RECEIVE' | 'CLOSE' | 'RECOUNT' | 'DISPUTE';
/**
 * PHASE 2.A: canPerformActionV2
 * Default Deny, Document-Type Aware.
 * Uses ROLE_CAPABILITIES as the single source of truth for role-based checks.
 * Falls back to transitionMapV2 for workflow status checks.
 */
export declare function canPerformActionV2(documentType: DocumentType, status: DocumentStatus, action: DocumentAction, role?: Role | string): boolean;
/**
 * Checks if a document is locked based on its status.
 * Locked documents cannot be edited.
 */
export declare function isDocumentLocked(type: DocumentType, status: string): boolean;
/**
 * Pure status helpers for metrics and analytics.
 * These are deterministic and role-independent.
 */
export declare function isPendingStatus(type: DocumentType, status: string): boolean;
export declare function isApprovedStatus(type: DocumentType, status: string): boolean;
export declare function isPostedStatus(type: DocumentType, status: string): boolean;
export declare function isCompletedStatus(type: DocumentType, status: string): boolean;
/**
 * Gets the next status for a given action using the Document-Aware engine.
 */
export declare function getNextStatusV2(documentType: DocumentType, status: DocumentStatus, action: DocumentAction): DocumentStatus | null;
