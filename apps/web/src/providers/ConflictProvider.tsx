'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { conflictBus, ConflictEventPayload } from '@/lib/api/conflict-bus';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useUnsavedChanges } from '@/lib/unsaved-changes/UnsavedChangesProvider';

export function ConflictProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<ConflictEventPayload | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const queryClient = useQueryClient();
  const { registerDirty } = useUnsavedChanges();

  useEffect(() => {
    return conflictBus.subscribe((newPayload) => {
      // Prevent dialog stacking: ignore new conflicts if one is already being handled
      setPayload((prev) => prev || newPayload);
    });
  }, []);

  const handleClose = useCallback(() => {
    setPayload(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const handleReload = useCallback(() => {
    // 1. Clear dirty state to allow fresh data loading without guard interference
    registerDirty(false);
    
    // 2. Targeted Invalidation: Try to refresh only the affected resource domain
    const mutationKey = payload?.mutation?.options?.mutationKey as unknown[];
    if (Array.isArray(mutationKey) && mutationKey.length > 0) {
      queryClient.invalidateQueries({ queryKey: [mutationKey[0]] });
    } else {
      queryClient.invalidateQueries();
    }
    
    handleClose();
  }, [queryClient, handleClose, payload, registerDirty]);

  const handleRetry = useCallback(async () => {
    if (!payload || retryCount >= 1) return;

    setIsRetrying(true);
    try {
      // Step A: Sync local query state with server before retry
      const mutationKey = payload.mutation?.options?.mutationKey as unknown[];
      if (Array.isArray(mutationKey) && mutationKey.length > 0) {
        await queryClient.refetchQueries({ queryKey: [mutationKey[0]] });
      }

      // Step B: Update version in variables
      const latestVersion = payload.error.currentVersion;
      const updatedVariables = { 
        ...(typeof payload.variables === 'object' ? payload.variables : { id: payload.variables }) 
      };
      
      if ('version' in updatedVariables) {
        updatedVariables.version = latestVersion;
      }

      // Step C: Re-execute using the stable mutation function
      const mutationFn = (payload.mutation.options as Record<string, unknown>).mutationFn;
      if (typeof mutationFn === 'function') {
        await mutationFn(updatedVariables);
        
        // Success - Final cleanup and sync
        if (Array.isArray(mutationKey) && mutationKey.length > 0) {
          queryClient.invalidateQueries({ queryKey: [mutationKey[0]] });
        }
        handleClose();
      } else {
        handleReload();
      }
    } catch {
      // If it fails again (even if another 409), increment retryCount to force manual reload
      setRetryCount((prev) => prev + 1);
    } finally {
      setIsRetrying(false);
    }
  }, [payload, retryCount, queryClient, handleClose, handleReload]);

  return (
    <>
      {children}
      <ConflictDialog
        open={!!payload}
        error={payload?.error || null}
        onRetry={handleRetry}
        onReload={handleReload}
        onClose={handleClose}
        isRetrying={isRetrying}
        retryCount={retryCount}
      />
    </>
  );
}
