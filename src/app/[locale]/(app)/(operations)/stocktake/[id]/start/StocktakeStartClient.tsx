"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { 
 ArrowLeft, 
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { LockBanner } from "@/components/shared/LockBanner";

import { useStocktake, useStartStocktake } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";

interface StocktakeStartClientProps {
 id: string;
 locale: 'ar' | 'en';
}

export function StocktakeStartClient({ id, locale }: StocktakeStartClientProps) {
 const t = useTranslations("operations.stocktake");
 const common = useTranslations("common");
 const router = useRouter();
 
 const { data: session, isLoading: sessionLoading, error: sessionError } = useStocktake(id);
 const { data: warehouses } = useWarehouses();
 const { data: lockState, isLoading: lockLoading } = useWarehouseLock(session?.warehouseId ?? null);
 const startStocktake = useStartStocktake();
 
 const [confirmOpen, setConfirmOpen] = useState(false);

 // Redirect if already started
 useEffect(() => {
 if (session && !['DRAFT', 'PENDING'].includes(session.status)) {
 router.replace(`/stocktake/${id}`);
 }
 }, [session, id, locale, router]);

 if (sessionLoading) return <LoadingSkeleton />;
 if (sessionError || !session) return <ErrorState onRetry={() => window.location.reload()} />;

 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouseName || session.warehouseId);

 const isAlreadyLocked = !lockLoading && lockState?.isLocked && lockState.sessionId !== id;

 const handleStart = () => {
 startStocktake.mutate(id, {
 onSuccess: () => {
 router.push(`/stocktake/${id}/count`);
 }
 });
 };

 return (
 <PermissionGate resource="operations_stocktake" action="edit">
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
 <PageHeader 
 title={t('start_session_title')}
 description={t('start_session_subtitle')}
 actions={
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={() => router.back()}
 className="text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground h-10 px-4 rounded-xl"
 >
 <ArrowLeft className={cn("w-4 h-4", locale === 'ar' ? 'rotate-180 ml-2' : 'mr-2')} />
 {common('back')}
 </Button>
 }
 />

 {isAlreadyLocked && <LockBanner lockState={lockState} />}

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="md:col-span-2 bg-surface-container-low border-none shadow-none rounded-[2.5rem] overflow-hidden">
 <CardContent className="p-10 space-y-10">
 <div className="flex items-center gap-6 pb-8 bg-white/[0.01]">
 <div className="p-4 rounded-[1.5rem] bg-amber-500/10 text-amber-500 border-none shadow-[0_0_40px_rgba(245,158,11,0.05)]">
 <ShieldAlert className="w-8 h-8" />
 </div>
 <div>
 <h3 className="text-title-lg font-semibold text-foreground">{t('pre_start_verification')}</h3>
 <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase mt-1 italic">
 {t('critical_lockdown_protocol')}
 </p>
 </div>
 </div>

 <div className="space-y-8">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
 <div className="space-y-2">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/30 flex items-center gap-2">
 <Warehouse className="w-3.5 h-3.5" />
 {common('warehouse')}
 </p>
 <p className="text-body-md font-semibold text-foreground">{warehouseName}</p>
 </div>
 <div className="space-y-2">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/30 flex items-center gap-2">
 <Calendar className="w-3.5 h-3.5" />
 {common('created_at')}
 </p>
 <p className="text-body-md font-semibold text-foreground" dir="ltr">
 {format(new Date(session.createdAt ?? session.snapshotAt), 'yyyy-MM-dd HH:mm')}
 </p>
 </div>
 <div className="space-y-2">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/30 flex items-center gap-2">
 <ClipboardList className="w-3.5 h-3.5" />
 {t('items_count')}
 </p>
 <p className="text-body-md font-semibold text-foreground">
 {session.items?.length || 0} {t('skus')}
 </p>
 </div>
 </div>

 <div className="p-8 rounded-3xl bg-surface-container-medium/30 border-none space-y-4">
 <h4 className="text-label-xs font-semibold uppercase text-cyan-500/70">{t('session_details')}</h4>
 <p className="text-title-sm font-semibold text-foreground">{session.sessionName}</p>
 {session.description && (
 <p className="text-body-md text-muted-foreground leading-relaxed font-medium">{session.description}</p>
 )}
 </div>
 </div>
 </CardContent>
 </Card>

 <div className="space-y-6">
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

 <Button
 onClick={() => setConfirmOpen(true)}
 disabled={startStocktake.isPending || isAlreadyLocked || lockLoading}
 className={cn(
 "w-full h-20 rounded-[1.5rem] text-white transition-all group overflow-hidden relative",
 isAlreadyLocked 
 ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" 
 : "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)]"
 )}
 >
 <div className="relative z-10 flex items-center justify-center gap-4">
 {startStocktake.isPending ? (
 <Loader2 className="w-6 h-6 animate-spin" />
 ) : isAlreadyLocked ? (
 <>
 <Lock className="w-6 h-6" />
 <span className="text-body-md font-semibold uppercase">{common('locked')}</span>
 </>
 ) : (
 <>
 <Play className="w-6 h-6 fill-current" />
 <span className="text-body-md font-semibold uppercase">{t('start_session')}</span>
 </>
 )}
 </div>
 {!isAlreadyLocked && (
 <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
 )}
 </Button>
 </div>
 </div>
 </div>

 <PostConfirmDialog
 isOpen={confirmOpen}
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
 );
}
