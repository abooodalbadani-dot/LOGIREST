'use client';

import { useTranslations } from 'next-intl';
import { 
  useKitchenRequest, 
  useUpdateKitchenRequestStatus 
} from '@/features/operations/hooks/useKitchenRequests';
import { AlertCircle } from 'lucide-react';
import { KitchenRequestForm } from './KitchenRequestForm';
import { KitchenRequestViewer } from './KitchenRequestViewer';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { useAuth } from '@/providers/AuthProvider';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { type DocumentStatus } from '@logirest/shared-types';

export function KitchenRequestDetailClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.kitchen_request');
  const { user } = useAuth();
  const isNew = id === 'new';
  const { data: request, isLoading } = useKitchenRequest(isNew ? '' : id);
  const conflict = useConflictHandler('kitchen-requests', id);

  const updateStatus = useUpdateKitchenRequestStatus({ onConflict: conflict.triggerConflict });

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!request && !isNew) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 min-w-0">
        <AlertCircle className="w-12 h-12 text-red-500/20" />
        <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('not_found')}</p>
      </div>
    );
  }

  const status = (request?.status || 'DRAFT') as DocumentStatus;
  const isTerminal = ['FULFILLED', 'CANCELLED', 'VOIDED'].includes(status);

  const handleCancel = async () => {
    if (!request) return;
    try {
      await updateStatus.mutateAsync({
        id: request.id,
        status: 'CANCELLED',
        reason: 'Cancelled from detail viewer action bar',
        version: request.version,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoid = async () => {
    if (!request) return;
    try {
      await updateStatus.mutateAsync({
        id: request.id,
        status: 'VOIDED',
        reason: 'Voided from detail viewer action bar',
        version: request.version,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const renderViewerActions = () => {
    if (!request) return null;
    return (
      <WorkflowActionBar
        documentType="KITCHEN_REQUEST"
        status={status}
        documentCreatorId={request.requestedBy}
        currentUserId={user?.id}
        userRole={user?.role}
        onCancel={handleCancel}
        isCancelPending={updateStatus.isPending}
        onVoid={handleVoid}
        isVoidPending={updateStatus.isPending}
        className="border-none shadow-none p-0 bg-transparent"
      />
    );
  };

  if (isTerminal && request) {
    return (
      <>
        <KitchenRequestViewer 
          request={request} 
          locale={locale} 
          actions={renderViewerActions()} 
        />
        <ConflictDialog 
          open={conflict.open}
          onClose={conflict.handleClose}
          onReload={conflict.handleReload}
        />
      </>
    );
  }

  return (
    <>
      <KitchenRequestForm 
        request={request!} 
        locale={locale} 
      />
      <ConflictDialog 
        open={conflict.open}
        onClose={conflict.handleClose}
        onReload={conflict.handleReload}
      />
    </>
  );
}
