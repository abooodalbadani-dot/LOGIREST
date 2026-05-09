'use client';

import { useState, useCallback } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';

interface UseConflictHandlerProps {
  queryKey: QueryKey;
}

/**
 * useConflictHandler - Enterprise Hook for Optimistic Locking Conflict Management.
 * Manages the state and actions for the ConflictDialog.
 * 
 * @param resource - The resource name (e.g., 'purchase-request')
 * @param id - The resource ID
 */
export function useConflictHandler(resource: string, id: string) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = [resource, id];

  const triggerConflict = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleReload = useCallback(async () => {
    // Invalidate the specific document query to fetch fresh data
    await queryClient.invalidateQueries({ queryKey });
    // Force a refetch for the active queries matching this key
    await queryClient.refetchQueries({ queryKey });
    setOpen(false);
  }, [queryClient, queryKey]);

  return {
    open,
    triggerConflict,
    handleReload,
    handleClose,
  };
}
