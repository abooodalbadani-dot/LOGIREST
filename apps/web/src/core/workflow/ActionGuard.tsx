'use client';

import * as React from 'react';
import { 
  canPerformActionV2, 
  DocumentAction, 
  DocumentType, 
  DocumentStatus,
  Role
} from './document-engine';

interface ActionGuardProps {
  /**
   * The type of document (e.g., 'PR', 'GRN', 'STOCKTAKE')
   */
  documentType: DocumentType;
  
  /**
   * Current status of the document
   */
  status: DocumentStatus;
  
  /**
   * Action to be performed (e.g., 'SUBMIT', 'APPROVE', 'POST')
   */
  action: DocumentAction;
  
  /**
   * The role of the current user
   */
  role: Role | string;
  
  /**
   * Content to render if the action is allowed
   */
  children: React.ReactNode;
  
  /**
   * Optional fallback to render if the action is NOT allowed
   */
  fallback?: React.ReactNode;
}

/**
 * ActionGuard Component
 * Centralized gatekeeper for UI actions based on workflow rules and permissions.
 * PHASE 2.B: Uses canPerformActionV2 for strict document-aware logic.
 */
export const ActionGuard: React.FC<ActionGuardProps> = ({
  documentType,
  status,
  action,
  role,
  children,
  fallback = null
}) => {
  // DEV VALIDATION: Prevent silent failure if documentType is missing
  if (!documentType && process.env.NODE_ENV === 'development') {
    throw new Error(`[ActionGuard] documentType is REQUIRED for action: ${action}`);
  }

  const allowed = canPerformActionV2(documentType, status, action, role);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
