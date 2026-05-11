'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { ConflictError } from '@/lib/api/ConflictError';

interface UseConflictHandlerProps {
  queryKey?: QueryKey;
}

/**
 * useConflictHandler - Enterprise Hook for Optimistic Locking Conflict Management.
 * Manages the state and actions for the ConflictDialog.
 * 
 * When a 409 conflict is detected:
 * - `triggerConflict` opens the conflict dialog
 * - `handleReload` invalidates data and closes the dialog
 * - `handleClose` dismisses the dialog but marks the form as "save disabled"
 *   per FR-007: the Save button stays disabled until the user reloads
 * 
 * @param resource - The resource name (e.g., 'purchase-request')
 * @param id - The resource ID
 */
export function useConflictHandler(resource: string, id: string, options?: UseConflictHandlerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ConflictError | null>(null);
  const [saveDisabled, setSaveDisabled] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => options?.queryKey || [resource, id], [options?.queryKey, resource, id]);

  const triggerConflict = useCallback((err?: unknown) => {
    if (err instanceof ConflictError) {
      setError(err);
    }
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSaveDisabled(true);
  }, []);

  const handleReload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.refetchQueries({ queryKey });
    setOpen(false);
    setError(null);
    setSaveDisabled(false);
  }, [queryClient, queryKey]);

  return {
    open,
    error,
    saveDisabled,
    triggerConflict,
    handleReload,
    handleClose,
  };
}