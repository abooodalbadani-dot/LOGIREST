"use client";
// Force Next.js Turbopack compiler cache invalidation after import layout changes
import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from "next-intl";
import { ClientOnlyTime } from "@/components/shared/ClientOnlyTime";
import { 
 ArrowRight, 
 Play, 
 Warehouse, 
 Calendar,
 AlertTriangle,
 ShieldAlert,
 Loader2,
 ClipboardList,
 Lock
} from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScopeGuard } from "@/components/shared/ScopeGuard";
import { LockBanner } from "@/components/shared/LockBanner";

import { useAuth } from "@/providers/AuthProvider";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { useStocktake, useStartStocktake } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { mapToSessionVM } from "@/features/operations/mappers/stocktakeMapper";
import { canStartStocktake } from "@/domain/status-guards";
import { type DocumentStatus } from "@logirest/shared-types";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

interface StocktakeStartClientProps {
 id: string;
}

export function StocktakeStartClient({ id }: StocktakeStartClientProps) {
 const t = useTranslations("operations.stocktake");
 const common = useTranslations("common");
 const { data: rawSession, isLoading: sessionLoading, error: sessionError } = useStocktake(id);
 const session = rawSession ? mapToSessionVM(rawSession) : null;
 
 const { user } = useAuth();
 const { data: warehousesData, isLoading: isLoadingWarehouses, error: errorWarehouses } = useWarehouses(); const warehouses = warehousesData?.data || [];
 const { data: lockState, isLoading: lockLoading, error: errorLock, guardedRouter: router } = useWarehouseLock(session?.warehouseId ?? null);
 const startStocktake = useStartStocktake();
 const { playSound } = useAudioFeedback();
 
 const [confirmOpen, setConfirmOpen] = useState(false);

 // Clean up pointer-events on unmount to prevent Radix UI Dialog freeze bug
 useEffect(() => {
  return () => {
   document.body.style.pointerEvents = 'auto';
  };
 }, []);

 // Redirect if already started
 useEffect(() => {
  if (session && !canStartStocktake(session.status)) {
   // Slight delay to ensure dialog animations complete before unmount
   const timer = setTimeout(() => {
    router.replace(`/stocktake/${id}`);
   }, 300);
   return () => clearTimeout(timer);
  }
 }, [session, id, router]);

 if (sessionLoading || isLoadingWarehouses || lockLoading) return <PageSkeleton variant="detail" />;
 if (sessionError || errorWarehouses || errorLock || !session) return <ErrorState onRetry={() => window.location.reload()} />;

 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? warehouse.name : (session.warehouseName || session.warehouseId);

 const isAlreadyLocked = !lockLoading && lockState?.isLocked && lockState.sessionId !== id;

 const handleStart = () => {
  startStocktake.mutate({ id }, {
   onSuccess: () => {
    playSound('success');
    router.push(`/stocktake/${id}/count`, { skipGuard: true });
   },
   onError: (error: unknown) => {
    playSound('error');
    const err = error as { code?: string; message?: string };
    if (err?.code === 'PENDING_DOCUMENTS') {
     toast.error(t('errors.pending_documents_error'));
    }
   }
  });
 };

 return (
  <ScopeGuard warehouseId={session?.warehouseId}>
   <PermissionGate resource="operations_stocktake" action="edit">
     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto text-start">
      <div className="flex justify-start w-full mb-6">
       <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.back()}
        className="text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground h-10 px-4 rounded-xl flex items-center"
       >
        <ArrowRight className="w-4 h-4 ml-2" />
        {common('back')}
       </Button>
      </div>

      <PageHeader 
       title={t('start_session_title')}
       description={t('start_session_subtitle')}
      />

      {isAlreadyLocked && <LockBanner lockState={lockState} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start w-full">
       <Card className="md:col-span-2 bg-card rounded-[2.5rem] overflow-hidden w-full border-none shadow-none">
        <CardContent className="p-10 space-y-10 text-start">
         <div className="flex items-start gap-6 pb-8 bg-card/[0.01] w-full text-start">
          <div className="p-4 rounded-[1.5rem] bg-amber-500/10 text-amber-500 border-none shadow-[0_0_40px_rgba(245,158,11,0.05)] shrink-0">
           <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1 text-start">
           <h3 className="text-title-lg font-semibold text-foreground text-start">{t('pre_start_verification')}</h3>
           <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase mt-1 italic text-start">
            {t('critical_lockdown_protocol')}
           </p>
          </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-start">
          {/* Warehouse */}
          <div className="flex flex-col items-start gap-1">
           <div className="flex items-center gap-2 text-sm text-muted-foreground flex-row-reverse justify-end w-full">
            <Warehouse className="w-4 h-4 ml-1" />
            <span>{common('warehouse')}</span>
           </div>
           <div className="text-lg font-semibold text-foreground">{warehouseName}</div>
          </div>

          {/* Date */}
          <div className="flex flex-col items-start gap-1">
           <div className="flex items-center gap-2 text-sm text-muted-foreground flex-row-reverse justify-end w-full">
            <Calendar className="w-4 h-4 ml-1" />
            <span>{common('created_at')}</span>
           </div>
           <div className="text-lg font-semibold text-foreground" dir="ltr">
            <ClientOnlyTime date={session.createdAt ?? session.snapshotAt} mode="datetime" />
           </div>
          </div>

          {/* Item Count */}
          <div className="flex flex-col items-start gap-1">
           <div className="flex items-center gap-2 text-sm text-muted-foreground flex-row-reverse justify-end w-full">
            <ClipboardList className="w-4 h-4 ml-1" />
            <span>{t('items_count')}</span>
           </div>
           <div className="text-lg font-semibold text-foreground">
            {session.items?.length || 0} {t('skus')}
           </div>
          </div>

          {/* Session Details */}
          <div className="flex flex-col items-start gap-1 md:col-span-2 bg-surface-container-medium/20 p-6 rounded-2xl w-full border border-border/40 text-start mt-2">
           <div className="flex items-center gap-2 text-sm text-muted-foreground flex-row-reverse justify-end w-full">
            <ClipboardList className="w-4 h-4 ml-1" />
            <span>{t('session_details')}</span>
           </div>
           <div className="text-lg font-semibold text-foreground mt-1 text-start">{session.sessionName}</div>
           {session.description && (
            <p className="text-body-md text-muted-foreground leading-relaxed font-medium mt-2 text-start">{session.description}</p>
           )}
          </div>
         </div>
        </CardContent>
       </Card>

       <div className="space-y-6 mt-8 md:mt-0 w-full">
 <Card className={cn(
 "rounded-[2.5rem] overflow-hidden border-none shadow-none",
 isAlreadyLocked ? "bg-amber-500/5" : "bg-red-500/5"
 )}>
 <CardContent className="p-8 space-y-6">
 <div className="flex items-start gap-4">
 <div className={cn(
 "p-2 rounded-xl shrink-0",
 isAlreadyLocked ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
 )}>
 <AlertTriangle className="w-5 h-5" />
 </div>
 <div className="space-y-2">
 <h5 className={cn(
 "text-label-xs font-semibold uppercase",
 isAlreadyLocked ? "text-amber-500" : "text-red-500"
 )}>
 {isAlreadyLocked ? t('already_locked') : t('irreversible_action')}
 </h5>
 <p className={cn(
 "text-label-xs leading-relaxed font-medium",
 isAlreadyLocked ? "text-amber-500/60" : "text-red-500/60"
 )}>
 {isAlreadyLocked ? t('warehouse_locked_warning') : t('start_warning_text')}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>

     <ActionGuard 
      documentType="STOCKTAKE" 
      status={session.status as DocumentStatus} 
      action="START" 
      role={user?.role || ''}
     >
      <Button
       onClick={() => setConfirmOpen(true)}
       disabled={startStocktake.isPending || lockLoading}
       className="w-full h-20 rounded-[1.5rem] text-white bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all group overflow-hidden relative"
      >
       <div className="relative z-10 flex items-center justify-center gap-4">
        {startStocktake.isPending ? (
         <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
         <>
          <Play className="w-6 h-6 fill-current" />
          <span className="text-body-md font-semibold uppercase">{t('start_session')}</span>
         </>
        )}
       </div>
       <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </Button>
     </ActionGuard>
 </div>
 </div>
 </div>

 <PostConfirmDialog
 open={confirmOpen}
 onOpenChange={setConfirmOpen}
 onConfirm={() => {
 setConfirmOpen(false);
 handleStart();
 }}
 variant="warning"
 title={t('start_confirm_title')}
 description={t('start_confirm_desc')}
 confirmText={t('start_action_confirm')}
 />
   </PermissionGate>
  </ScopeGuard>
 );
}
