"use client"

import * as React from "react";
import { useStocktake, usePostStocktake } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useTranslations } from "next-intl";
import { mapToSessionVM } from "@/features/operations/mappers/stocktakeMapper";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";
import { 
 BarChart3, 
 CheckCircle2, 
 AlertTriangle,
 ArrowRight,
 ShieldAlert,
 Info
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { canPerformActionV2, type DocumentStatus } from '@logirest/shared-types';

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScopeGuard } from "@/components/shared/ScopeGuard";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';

export function StocktakePostClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const { router, setDirty } = useUnsavedChangesGuard()
  const { user } = useAuth();
  const { currency: baseCurrency } = useBaseCurrency();
  
  const { data: rawSession, isLoading, error } = useStocktake(id);
 const session = rawSession ? mapToSessionVM(rawSession) : null;
 const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
 const postStocktake = usePostStocktake();
 const { playSound } = useAudioFeedback();

 const [confirmValue, setConfirmValue] = React.useState("");
  const confirmKeyword = t('confirm_keyword') || 'POST';

 // Unsaved changes guard
 React.useEffect(() => {
   setDirty(confirmValue !== "");
   return () => setDirty(false);
 }, [confirmValue, setDirty]);

 if (isLoading) return <LoadingSkeleton />
 if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />

 // Access Control: Only ADMIN and status APPROVED
 if (!canPerformActionV2('STOCKTAKE', session.status as DocumentStatus, 'POST', user?.role)) {
 router.replace(`/stocktake/${id}`);
 return null;
 }

  const warehouse = warehouses?.find(w => w.id === session.warehouseId);
  const warehouseName = warehouse ? warehouse.name : (session.warehouseName || session.warehouseId);

  const handlePost = () => {
    if (confirmValue !== confirmKeyword) return;
    
    postStocktake.mutate({ id }, {
      onSuccess: () => {
        playSound('success');
        toast.success(t('posted_success_variance'));
        router.push(`/stocktake/${id}`, { skipGuard: true });
      },
      onError: () => {
        playSound('error');
        toast.error(common('error'));
      }
    });
  };

 const netImpact = session.items.reduce((acc, item) => {
 return acc + ((item.variance || 0) * item.unitCost);
 }, 0);

 return (
 <ScopeGuard warehouseId={session?.warehouseId}>
  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <PermissionGate action="post" resource="operations_stocktake">
  <PageHeader
  title={
  <div className="flex items-center gap-4">
  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
  <ShieldAlert className="w-6 h-6 text-primary" />
  </div>
  <div className="flex flex-col">
  <span className="font-semibold text-headline-lg">
  {t('final_posting')}
  </span>
  <span className="text-label-xs uppercase font-semibold text-muted-foreground/40 mt-1">
  {session.sessionName} • {warehouseName}
  </span>
  </div>
  </div>
  }
  backHref={`/stocktake/${id}`}
  />

  {/* Warning Panel */}
  <Card className="bg-status-error/5 border-none shadow-none rounded-[2.5rem] p-10 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
  <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
  <ShieldAlert className="w-48 h-48 text-status-error" />
  </div>
  
  <div className="w-16 h-16 rounded-2xl bg-status-error/10 flex items-center justify-center shrink-0">
  <AlertTriangle className="w-8 h-8 text-status-error" />
  </div>
  
  <div className="space-y-6 relative z-10">
  <div className="space-y-2">
  <h3 className="text-title-lg font-semibold text-foreground">{t('post_warning_title')}</h3>
  <p className="text-muted-foreground leading-relaxed max-w-xl">
  {t('post_warning_desc')}
  </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
  <div className="p-5 bg-white/[0.02] rounded-2xl space-y-1">
  <span className="text-label-xs font-semibold uppercase text-muted-foreground/30">{t('total_adjustments')}</span>
  <p className="text-title-sm font-semibold text-foreground">{session.items.filter(i => (i.variance || 0) !== 0).length} {t('skus')}</p>
  </div>
  <div className="p-5 bg-white/[0.02] rounded-2xl space-y-1">
  <span className="text-label-xs font-semibold uppercase text-muted-foreground/30">{t('net_financial_value')}</span>
  <p className={cn("text-title-sm font-semibold", netImpact >= 0 ? "text-status-success" : "text-status-error")} dir="ltr">
   {formatCurrency(netImpact, baseCurrency, locale)}
  </p>
  </div>
  </div>

  <div className="flex flex-col gap-4 bg-white/[0.03] p-6 rounded-2xl border border-white/[0.05]">
  <div className="flex items-center gap-2 text-label-xs font-semibold uppercase text-muted-foreground/50">
  <Info className="w-3 h-3" />
  <span>{t('type_to_confirm_label')}</span>
  </div>
  <div className="flex flex-col md:flex-row gap-3">
  <Input 
  value={confirmValue}
  onChange={(e) => setConfirmValue(e.target.value)}
  placeholder={t('confirm_keyword_placeholder', { keyword: confirmKeyword })}
  className="bg-surface-container-lowest border-none h-12 px-6 font-semibold placeholder:text-muted-foreground/20 placeholder:tracking-normal"
  />
  <Button 
  onClick={handlePost}
  disabled={confirmValue !== confirmKeyword || postStocktake.isPending}
  className="primary-gradient h-12 px-10 shadow-lg shadow-primary/20"
  >
  {t('confirm_final_post')}
  <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
  </Button>
  </div>
  </div>
  </div>
  </Card>

  {/* Read-only manifest link */}
  <div className="flex justify-center">
  <Button variant="link" onClick={() => router.push(`/stocktake/${id}`)} className="text-muted-foreground/40 hover:text-primary transition-colors text-label-xs font-semibold uppercase">
  {t('return_to_manifest')}
  </Button>
  </div>
  </PermissionGate>
  </div>
 </ScopeGuard>
 )
}
