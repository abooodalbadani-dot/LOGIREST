'use client';

import { useMemo } from 'react';
import { isDocumentLocked, type DocumentType } from '@logirest/shared-types';

/**
 * Hook to determine if a document should be locked (read-only) based on its status.
 * Centrally managed via document-engine logic.
 */
export function useDocumentLock(type: DocumentType, status: string | undefined) {
  const isLocked = useMemo(() => {
    if (!status) return false;
    return isDocumentLocked(type, status);
  }, [type, status]);

  return {
    isLocked,
    // Helper to conditionally apply styles or props
    lockProps: isLocked ? { disabled: true, readOnly: true } : {},
  };
}
