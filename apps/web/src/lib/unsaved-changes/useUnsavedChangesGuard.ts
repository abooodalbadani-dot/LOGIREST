'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useUnsavedChanges } from './UnsavedChangesProvider';
import { useRouter as useNextIntlRouter } from '@/i18n/navigation';

export interface GuardedRouterOptions {
  skipGuard?: boolean;
  [key: string]: unknown;
}

/**
 * useUnsavedChangesGuard
 * 
 * A hook for components (usually forms) to register their dirty state
 * and get a guarded router that intercepts navigation attempts.
 * 
 * @param componentDirty Optional boolean to automatically sync with global dirty state
 */
export const useUnsavedChangesGuard = (componentDirty?: boolean) => {
  const { isDirty: globalDirty, registerDirty, openDialog } = useUnsavedChanges();
  const baseRouter = useNextIntlRouter();

  // Automatically sync component-level dirty state with global state
  useEffect(() => {
    if (componentDirty !== undefined) {
      registerDirty(componentDirty);
    }
    
    // Cleanup: reset dirty state on unmount
    return () => {
      if (componentDirty !== undefined) {
        registerDirty(false);
      }
    };
  }, [componentDirty, registerDirty]);

  const setDirty = useCallback((dirty: boolean) => {
    registerDirty(dirty);
  }, [registerDirty]);

  /**
   * Guarded Router
   * Intercepts push, replace, and back calls to show the unsaved changes dialog
   * if the application is in a dirty state.
   */
  const guardedRouter = useMemo(() => ({
    ...baseRouter,
    push: (href: string, options?: GuardedRouterOptions) => {
      if (globalDirty && !options?.skipGuard) {
        openDialog(href, options);
      } else {
        // If skipGuard is true, we should also reset the dirty state
        if (options?.skipGuard) {
          registerDirty(false);
        }
        baseRouter.push(href, options as Parameters<typeof baseRouter.push>[1]);
      }
    },
    replace: (href: string, options?: GuardedRouterOptions) => {
      if (globalDirty && !options?.skipGuard) {
        openDialog(href, options);
      } else {
        if (options?.skipGuard) {
          registerDirty(false);
        }
        baseRouter.replace(href, options as Parameters<typeof baseRouter.replace>[1]);
      }
    },
    back: () => {
      if (globalDirty) {
        openDialog('BACK');
      } else {
        baseRouter.back();
      }
    }
  }), [baseRouter, globalDirty, openDialog, registerDirty]);

  return {
    isDirty: globalDirty,
    setDirty,
    registerDirty,
    router: guardedRouter
  };
};

