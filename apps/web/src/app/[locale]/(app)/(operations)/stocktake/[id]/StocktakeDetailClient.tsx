"use client"

import * as React from "react";
import { useStocktake } from "@/features/operations/api/useStocktakes";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
  Play,
  CheckCircle2,
  AlertTriangle,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { type DocumentStatus } from "@/core/workflow/document-engine";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { isLocked as isDomainLocked } from "@/domain/status-guards";
import { mapToSessionVM } from "@/features/operations/mappers/stocktakeMapper";
import { StocktakeForm } from "./StocktakeForm";
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

export function StocktakeDetailClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake')
  const router = useRouter()
  const { user } = useAuth();
  const conflict = useConflictHandler('stocktake', id);
  
  const { data: rawSession, isLoading, error } = useStocktake(id);
  const session = rawSession ? mapToSessionVM(rawSession) : null;

  if (isLoading) return <PageSkeleton variant="detail" />
  if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />

  const status = session.status as DocumentStatus;
  const isLocked = isDomainLocked('STOCKTAKE', status);

  const headerActions = (
    <div className="flex items-center gap-3">
      <PermissionGate action="edit" resource="operations_stocktake">
        {status === 'DRAFT' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="START" role={user?.role || ''}>
            <Button onClick={() => router.push(`/stocktake/${id}/start`)} variant="outline" size="sm" className="h-9 rounded-lg" disabled={isLocked}>
              <Play className="w-4 h-4 me-2 fill-current" />
              {t('start_session')}
            </Button>
          </ActionGuard>
        )}
        
        {status === 'STARTED' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="COUNT" role={user?.role || ''}>
            <Button onClick={() => router.push(`/stocktake/${id}/count`)} variant="outline" size="sm" className="h-9 rounded-lg" disabled={isLocked}>
              <ClipboardList className="w-4 h-4 me-2" />
              {t('go_to_count')}
            </Button>
          </ActionGuard>
        )}

        {status === 'COUNTING' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="REVIEW_VARIANCE" role={user?.role || ''}>
            <Button onClick={() => router.push(`/stocktake/${id}/variance`)} variant="outline" size="sm" className="h-9 rounded-lg" disabled={isLocked}>
              <AlertTriangle className="w-4 h-4 me-2" />
              {t('review_variance')}
            </Button>
          </ActionGuard>
        )}
      </PermissionGate>

      <PermissionGate action="approve" resource="operations_stocktake">
        {status === 'REVIEW' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="APPROVE" role={user?.role || ''}>
            <Button onClick={() => router.push(`/stocktake/${id}/approve`)} variant="outline" size="sm" className="h-9 rounded-lg" disabled={isLocked}>
              <CheckCircle2 className="w-4 h-4 me-2" />
              {t('review_approval')}
            </Button>
          </ActionGuard>
        )}
      </PermissionGate>

      <PermissionGate action="post" resource="operations_stocktake">
        {status === 'APPROVED' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="POST" role={user?.role || ''}>
            <Button onClick={() => router.push(`/stocktake/${id}/post`)} variant="outline" size="sm" className="h-9 rounded-lg" disabled={isLocked}>
              <CheckCircle2 className="w-4 h-4 me-2" />
              {t('go_to_post')}
            </Button>
          </ActionGuard>
        )}
      </PermissionGate>
    </div>
  );

  return (
    <>
      <StocktakeForm 
        session={session} 
        locale={locale} 
        actions={headerActions} 
        isLocked={isLocked}
        onConflict={conflict.triggerConflict}
      />
      <ConflictDialog 
        open={conflict.open}
        onClose={conflict.handleClose}
        onReload={conflict.handleReload}
      />
    </>
  );
}
