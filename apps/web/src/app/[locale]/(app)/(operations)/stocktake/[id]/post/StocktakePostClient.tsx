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

  // Access Control: Redirect if not allowed
  const isAllowed = React.useMemo(() => {
    if (!session) return false;
    return canPerformActionV2('STOCKTAKE', session.status as DocumentStatus, 'POST', user?.role);
  }, [session, user?.role]);

  React.useEffect(() => {
    if (!isLoading && session && !isAllowed) {
      router.replace(`/stocktake/${id}`);
    }
  }, [isLoading, session, isAllowed, router, id]);

  if (isLoading) return <LoadingSkeleton />
  if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />
  if (!isAllowed) return null;

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
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PermissionGate action="post" resource="operations_stocktake">
          <PageHeader
            title={
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
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
            className="w-full text-start"
          />

          {/* Warning Panel */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 flex flex-col md:flex-row items-start gap-4 w-full mb-8 text-start">
            <div className="shrink-0 p-2 bg-destructive/20 rounded-full mt-1">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex flex-col flex-1 w-full gap-2">
              <h3 className="text-lg font-bold text-destructive">{t('post_warning_title')}</h3>
              <p className="text-muted-foreground leading-relaxed w-full whitespace-normal break-words">
                {t('post_warning_desc')}
              </p>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
            <div className="flex flex-col items-start text-start gap-2 p-6 rounded-xl bg-card border border-brand-gold/20 w-full shadow-sm">
              <span className="text-sm font-semibold text-muted-foreground">{t('total_adjustments')}</span>
              <span className="text-3xl font-bold text-foreground">
                {session.items.filter(i => (i.variance || 0) !== 0).length}
              </span>
            </div>
            <div className="flex flex-col items-start text-start gap-2 p-6 rounded-xl bg-card border border-brand-gold/20 w-full shadow-sm">
              <span className="text-sm font-semibold text-muted-foreground">{t('net_financial_value')}</span>
              <span className={cn("text-3xl font-bold font-mono tabular-nums", netImpact >= 0 ? "text-status-success" : "text-status-error")} dir="ltr">
                {formatCurrency(netImpact, baseCurrency, locale)}
              </span>
            </div>
          </div>

          {/* Confirmation Section */}
          <div className="flex flex-col gap-4 bg-card p-6 rounded-xl border border-brand-gold/20 w-full min-w-0 mb-8">
            <div className="flex items-center gap-2 text-label-xs font-semibold uppercase text-muted-foreground/50">
              <Info className="w-3 h-3" />
              <span>{t('type_to_confirm_label')}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-3 min-w-0">
              <Input
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                placeholder={t('confirm_keyword_placeholder', { keyword: confirmKeyword })}
                className="flex-1 bg-background border border-brand-gold/40 h-12 px-6 font-semibold"
              />
              <Button
                onClick={handlePost}
                disabled={confirmValue !== confirmKeyword || postStocktake.isPending}
                className="bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors h-12 px-10 shadow-sm shadow-primary/20 shrink-0"
              >
                {t('confirm_final_post')}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Button>
            </div>
          </div>

          {/* Read-only manifest link */}
          <div className="flex justify-center w-full mt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/stocktake/${id}`)}
              className="border border-brand-gold/30 text-foreground bg-transparent hover:bg-brand-gold/10 hover:text-brand-gold transition-all duration-200 px-8 h-11 rounded-xl text-sm font-bold gap-2 flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4 rotate-180 rtl:rotate-0" />
              {t('return_to_manifest')}
            </Button>
          </div>
        </PermissionGate>
      </div>
    </ScopeGuard>
  )
}
