"use client"

import * as React from "react";
import { useStocktake } from "@/features/operations/api/useStocktakes";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
  Play,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Scan,
  Printer,
  History
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

  const workflowActions = (
    <div className="flex items-center gap-2">
      {/* Quick Tools Group */}
      <div className="flex items-center gap-1 me-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => window.print()}
          className="h-10 w-10 md:h-12 md:w-12 rounded-full text-white/50 hover:text-operational-cyan hover:bg-white/5 transition-all"
          title={t('print_labels') || 'Print Manifest'}
        >
          <Printer className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-10 w-10 md:h-12 md:w-12 rounded-full text-white/50 hover:text-operational-cyan hover:bg-white/5 transition-all"
          title={t('audit_trail') || 'Audit Trail'}
        >
          <History className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

      <PermissionGate action="edit" resource="operations_stocktake">
        {status === 'DRAFT' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="START" role={user?.role || ''}>
            <Button 
              onClick={() => router.push(`/stocktake/${id}/start`)} 
              className="h-10 md:h-12 px-4 md:px-8 bg-primary text-white rounded-full gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] md:text-xs font-black uppercase tracking-wide" 
              disabled={isLocked}
            >
              <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
              <span className="hidden xs:inline">{t('start_session')}</span>
            </Button>
          </ActionGuard>
        )}
        
        {status === 'STARTED' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="COUNT" role={user?.role || ''}>
            <Button 
              onClick={() => router.push(`/stocktake/${id}/count`)} 
              className="h-10 md:h-12 px-4 md:px-8 bg-operational-cyan text-white rounded-full gap-2 shadow-lg shadow-operational-cyan/20 hover:scale-105 active:scale-95 transition-all text-[10px] md:text-xs font-black uppercase tracking-wide" 
              disabled={isLocked}
            >
              <ClipboardList className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden xs:inline">{t('go_to_count')}</span>
            </Button>
          </ActionGuard>
        )}

        {status === 'COUNTING' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="REVIEW_VARIANCE" role={user?.role || ''}>
            <Button 
              onClick={() => router.push(`/stocktake/${id}/variance`)} 
              className="h-10 md:h-12 px-4 md:px-8 bg-amber-500 text-white rounded-full gap-2 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all text-[10px] md:text-xs font-black uppercase tracking-wide" 
              disabled={isLocked}
            >
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden xs:inline">{t('review_variance')}</span>
            </Button>
          </ActionGuard>
        )}
      </PermissionGate>

      <PermissionGate action="approve" resource="operations_stocktake">
        {status === 'REVIEW' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="APPROVE" role={user?.role || ''}>
            <Button 
              onClick={() => router.push(`/stocktake/${id}/approve`)} 
              className="h-10 md:h-12 px-4 md:px-8 bg-emerald-500 text-white rounded-full gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-[10px] md:text-xs font-black uppercase tracking-wide" 
              disabled={isLocked}
            >
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden xs:inline">{t('review_approval')}</span>
            </Button>
          </ActionGuard>
        )}
      </PermissionGate>

      <PermissionGate action="post" resource="operations_stocktake">
        {status === 'APPROVED' && (
          <ActionGuard documentType="STOCKTAKE" status={status} action="POST" role={user?.role || ''}>
            <Button 
              onClick={() => router.push(`/stocktake/${id}/post`)} 
              className="h-10 md:h-12 px-6 md:px-10 bg-operational-cyan text-white rounded-full gap-2 shadow-lg shadow-operational-cyan/20 hover:scale-105 active:scale-95 transition-all text-[10px] md:text-xs font-black uppercase tracking-wide" 
              disabled={isLocked}
            >
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden xs:inline">{t('go_to_post')}</span>
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
        actions={workflowActions} 
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
