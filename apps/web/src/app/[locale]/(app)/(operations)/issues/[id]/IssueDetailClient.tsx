"use client";

import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { useIssue } from '@/features/operations/hooks/useIssue';
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { useCancelIssue } from '@/features/operations/hooks/useCancelIssue';
import { useVoidIssue } from '@/features/operations/hooks/useVoidIssue';
import { isDocumentLocked, type DocumentStatus } from '@logirest/shared-types';
import { IssueForm } from '@/features/operations/components/issue-form';
import { IssueViewer } from './IssueViewer';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { useAuth } from '@/providers/AuthProvider';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { ScopeGuard } from '@/components/shared/ScopeGuard';
import { toast } from 'sonner';

export function IssueDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.issue');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const isNew = id === 'new';
  const { data: issue, isLoading } = useIssue(isNew ? null : id);

  const conflict = useConflictHandler('issue', id);
  const postIssue = usePostIssue();
  const cancelIssue = useCancelIssue();
  const voidIssue = useVoidIssue(issue?.id || id);

  if (isLoading) {
    return (
      <div className="min-w-0 items-center bg-card flex-1 space-y-8 gap-6 animate-pulse rounded-lg justify-center shadow-sm flex-col flex border border-border min-h-[60vh] w-full dark:bg-card-dark">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/5 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-4 border-2 border-b-primary/10 rounded-full animate-spin-slow" />
          <Package className="w-10 h-10 text-primary/20 animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-2 min-w-0">
          <div className="text-label-xs font-semibold uppercase text-primary/60 animate-pulse">
            {t('synchronizing_matrix')}
          </div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
      </div>
    );
  }

  const status = (issue?.status ?? 'DRAFT') as DocumentStatus;
  const isDocLocked = isDocumentLocked('ISSUE', status);

  const handlePost = async () => {
    if (!issue) return;
    try {
      await postIssue.mutateAsync({
        id: issue.id,
        confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
        version: issue.version,
      });
      toast.success(t('posted_success') || 'Stock issue posted successfully');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async () => {
    if (!issue) return;
    try {
      await cancelIssue.mutateAsync({
        id: issue.id,
        version: issue.version,
      });
      toast.success(t('cancel_success') || 'Stock issue cancelled');
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoid = async () => {
    if (!issue) return;
    try {
      await voidIssue.mutateAsync({
        version: issue.version || 1,
      });
      toast.success(tc('void_success') || 'Stock issue voided successfully');
    } catch (err) {
      console.error(err);
    }
  };

  const renderActions = () => {
    if (!issue) return null;
    return (
      <WorkflowActionBar
        documentType="ISSUE"
        status={status}
        documentCreatorId={issue.createdById || issue.createdBy}
        currentUserId={user?.id}
        userRole={user?.role}
        onPost={handlePost}
        isPostPending={postIssue.isPending}
        onCancel={handleCancel}
        isCancelPending={cancelIssue.isPending}
        onVoid={handleVoid}
        isVoidPending={voidIssue.isPending}
        className="border-none shadow-none p-0 bg-transparent"
      />
    );
  };

  if (isDocLocked && issue) {
    return (
      <ScopeGuard warehouseId={issue.warehouseId}>
        <IssueViewer issue={issue} locale={locale} actions={renderActions()} />
      </ScopeGuard>
    );
  }

  return (
    <ScopeGuard warehouseId={issue?.warehouseId}>
      <IssueForm 
        key={id}
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
