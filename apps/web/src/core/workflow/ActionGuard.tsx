'use client';

import * as React from 'react';
import { 
  canPerformActionV2, 
  DocumentAction, 
  DocumentType, 
  DocumentStatus,
  Role
} from '@logirest/shared-types';

import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';

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
  role?: Role | string;
  
  /**
   * Content to render if the action is allowed
   */
  children?: React.ReactNode;

  /**
   * Optional trigger element (alternative to children)
   */
  trigger?: React.ReactElement;
  
  /**
   * Optional callback for confirmation
   */
  onConfirm?: () => void | Promise<void>;

  /**
   * Dialog title if onConfirm is provided
   */
  title?: string;

  /**
   * Dialog description if onConfirm is provided
   */
  description?: string;

  /**
   * Whether to require text confirmation
   */
  requiresTextConfirmation?: boolean;

  /**
   * Optional keyword for text confirmation
   */
  confirmKeyword?: string;
  
  /**
   * Optional fallback to render if the action is NOT allowed
   */
  fallback?: React.ReactNode;

  /**
   * Loading state for the action
   */
  isLoading?: boolean;

  /**
   * Disabled state for the action
   */
  disabled?: boolean;
}

/**
 * ActionGuard Component
 * Centralized gatekeeper for UI actions based on workflow rules and permissions.
 * PHASE 2.B: Uses canPerformActionV2 for strict document-aware logic.
 * Support for direct confirmation logic via PostConfirmDialog.
 */
export const ActionGuard: React.FC<ActionGuardProps> = ({
  documentType,
  status,
  action,
  role,
  children,
  trigger,
  onConfirm,
  title,
  description,
  requiresTextConfirmation,
  confirmKeyword,
  fallback = null,
  isLoading = false,
  disabled = false,
}) => {
  // DEV VALIDATION: Prevent silent failure if documentType is missing
  if (!documentType && process.env.NODE_ENV === 'development') {
    throw new Error(`[ActionGuard] documentType is REQUIRED for action: ${action}`);
  }

  const allowed = canPerformActionV2(documentType, status, action, role);

  if (!allowed) {
    return <>{fallback}</>;
  }

  // If onConfirm is provided, wrap with PostConfirmDialog
  if (onConfirm) {
    return (
      <PostConfirmDialog
        title={title || ''}
        description={description || ''}
        onConfirm={onConfirm}
        requiresTextConfirmation={requiresTextConfirmation}
        confirmKeyword={confirmKeyword}
        isLoading={isLoading}
        disabled={disabled}
        trigger={trigger || (children as React.ReactElement)}
      />
    );
  }

  return <>{trigger || children}</>;
};

