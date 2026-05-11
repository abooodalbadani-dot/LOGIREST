'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { locales } from '@/i18n/routing';

interface PendingNavigation {
  href: string;
  options?: unknown;
}

interface UnsavedChangesContextType {
  isDirty: boolean;
  registerDirty: (dirty: boolean) => void;
  confirmNavigation: () => void;
  openDialog: (targetPath: string, options?: unknown) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

/**
 * UnsavedChangesProvider
 * 
 * Provides a global mechanism to prevent data loss by intercepting navigation
 * when there are unsaved changes (isDirty).
 * 
 * Intercepts:
 * 1. Browser refresh/close (beforeunload)
 * 2. Browser back/forward buttons (popstate)
 * 3. Link clicks (standard <a> tags)
 * 4. Programmatic navigation (via useUnsavedChangesGuard)
 */
export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [open, setOpen] = useState(false);

  const registerDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const openDialog = useCallback((targetPath: string, options?: unknown) => {
    setPendingNavigation({ href: targetPath, options });
    setOpen(true);
  }, []);

  const confirmNavigation = useCallback(() => {
    setIsDirty(false);
    setOpen(false);
    setPendingNavigation(null);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setPendingNavigation(null);
  }, []);

  // Handle browser close/refresh (Native browser dialog)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Standard trigger for browser confirmation
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (isDirty) {
        // Prevent immediate navigation by pushing the state back
        window.history.pushState(null, '', window.location.href);
        openDialog('BACK');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, openDialog]);

  // Intercept standard link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirty) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      // Intercept only internal links without skip-guard attribute
      if (
        anchor && 
        anchor.href && 
        !anchor.target && 
        !anchor.hasAttribute('download') &&
        anchor.getAttribute('data-skip-guard') !== 'true'
      ) {
        const url = new URL(anchor.href);
        
        // Ensure it's the same origin
        if (url.origin === window.location.origin) {
          const targetPath = url.pathname + url.search + url.hash;
          const currentPath = window.location.pathname + window.location.search + window.location.hash;
          
          if (targetPath !== currentPath) {
            e.preventDefault();
            
            // Strip locale prefix if present to avoid double-locale in localized router
            let unlocalizedPath = targetPath;
            const segments = targetPath.split('/');
            if (segments.length > 1 && (locales as readonly string[]).includes(segments[1])) {
              unlocalizedPath = '/' + segments.slice(2).join('/');
              // Preserve search and hash which were already part of targetPath
            }
            
            openDialog(unlocalizedPath);
          }
        }
      }
    };

    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [isDirty, openDialog]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, registerDirty, confirmNavigation, openDialog }}>
      {children}
      <UnsavedChangesDialog
        open={open}
        onClose={closeDialog}
        pendingNavigation={pendingNavigation}
      />
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider');
  }
  return context;
};

