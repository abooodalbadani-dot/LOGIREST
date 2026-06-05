"use client";

import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { useIssue } from '@/features/operations/hooks/useIssue';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { IssueForm } from '@/features/operations/components/issue-form';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { ScopeGuard } from '@/components/shared/ScopeGuard';

export function IssueDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.issue');
  const isNew = id === 'new';
  const { data: issue, isLoading } = useIssue(isNew ? null : id);
  
  const conflict = useConflictHandler('issue', id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 bg-surface-container-low rounded-lg animate-pulse">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/5 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-4 border-2 border-b-primary/10 rounded-full animate-spin-slow" />
          <Package className="w-10 h-10 text-primary/20 animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-label-xs font-semibold uppercase text-primary/60 animate-pulse">
            {t('synchronizing_matrix')}
          </div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
      </div>
    );
  }

  return (
    <ScopeGuard warehouseId={issue?.warehouseId}>
      <IssueForm 
        key={issue?.version || id}
        issue={issue} 
        id={id} 
        isNew={isNew} 
        onConflict={conflict.triggerConflict}
      />
      <ConflictDialog 
        open={conflict.open}
        onClose={conflict.handleClose}
        onReload={conflict.handleReload}
      />
    </ScopeGuard>
  );
}
