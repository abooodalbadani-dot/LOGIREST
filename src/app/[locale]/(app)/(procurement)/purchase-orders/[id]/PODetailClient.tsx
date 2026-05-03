'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { usePO, type AuditLog, type POLine } from '@/features/purchasing/hooks/usePO';
import { useSubmitPO } from '@/features/purchasing/hooks/useSubmitPO';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PurchaseOrderForm } from '@/features/purchasing/components/po-form';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle, Clock, Wallet, Warehouse, User, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

import { cn, formatQuantity, formatCurrency, formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export function PODetailClient({ id }: { id: string | null }) {
 const locale = useLocale() as 'ar' | 'en';
 const t = useTranslations('procurement.po');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { data: po, isLoading } = usePO(id || '');
 const submitMutation = useSubmitPO();

 const isNew = !id || id === 'new';
 const isDraft = isNew || po?.status === 'DRAFT';
 const isSubmitted = po?.status === 'SUBMITTED';

 const formattedDate = useMemo(() => {
    if (!po?.created_at) return '---';
    return formatDate(po.created_at, locale);
  }, [po?.created_at, locale]);

 if (isLoading) {
 return (
 <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low rounded-lg animate-pulse">
 <div className="relative">
 <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
 </div>
 <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60">{tCommon('loading')}</p>
 </div>
 );
 }

 const handleSubmit = async () => {
 if (!id) return;
 try {
 await submitMutation.mutateAsync(id);
 router.refresh();
 } catch (e) {
 console.error(e);
 }
 };

 const timeline = po?.audit_log?.map((log: AuditLog) => ({
 status: log.status.toLowerCase() as Status,
 at: log.created_at,
 by: log.user_name || tCommon('system')
 })) || [];

 return (
 <div className="min-h-screen bg-surface-container-low pb-12 animate-in fade-in duration-500">
 {/* Ledger Header (Solid, No Glass) */}
 <div className="w-full bg-surface-container-lowest border-b border-outline-variant/50 shadow-sm">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
 <div className="flex flex-col">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/50">
 {isNew ? t('create_new') : t('specification')}
 </span>
 {!isNew && (
 <>
 <span className="text-muted-foreground/20 text-label-xs">|</span>
 <div className="flex items-center gap-1.5 text-label-xs font-bold text-muted-foreground/40 uppercase">
 <Clock className="w-3 h-3" />
 <span dir="ltr" className="font-mono">{formattedDate}</span>
 </div>
 </>
 )}
 </div>
 <div className="flex items-center gap-3">
 <h1 className="font-semibold text-headline-lg">
 <span dir="ltr" className="font-mono">{isNew ? t('create_new') : `#${po?.document_number}`}</span>
 </h1>
 {!isNew && <StatusBadge status={po?.status as BadgeStatus} />}
 </div>
 </div>

 <div className="flex items-center gap-3">
 <PermissionGate action="submit" resource="po">
 {po?.status === 'DRAFT' && (
 <Button
 onClick={handleSubmit}
 disabled={submitMutation.isPending}
 className="bg-primary text-primary-foreground hover:brightness-110 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs"
 >
 <Send className="w-4 h-4 me-2" />
 {t('actions.submit')}
 </Button>
 )}
 </PermissionGate>

 <PermissionGate action="approve" resource="po">
 {isSubmitted && (
 <Button
 onClick={() => router.push(`/purchase-orders/${id}/approve`)}
 className="bg-surface-container-highest text-foreground hover:bg-surface-container-high h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-outline-variant/50"
 >
 <CheckCircle className="w-4 h-4 me-2" />
 {t('actions.go_to_approval')}
 </Button>
 )}
 </PermissionGate>
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
 {isDraft ? (
 <PurchaseOrderForm initialData={po} mode={isNew ? 'create' : 'edit'} />
 ) : (
 <div className="space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 {[
 { label: tCommon('supplier'), value: po?.supplier_name || po?.supplier_id, icon: User, color: 'text-primary' },
 { label: tCommon('order_currency'), value: po?.currency_id, icon: Wallet, color: 'text-operational-cyan' },
 { label: t('target_warehouse'), value: po?.warehouse_name || po?.target_warehouse_id, icon: Warehouse, color: 'text-emerald-500' },
 { label: t('expected_delivery_date'), value: po?.expected_delivery_date || '—', icon: Clock, color: 'text-amber-500' },
 ].map((item, idx) => (
 <Card key={idx} className="p-5 bg-surface-container-lowest border-none shadow-sm flex flex-col gap-3 rounded-lg relative overflow-hidden group">
 <div className="flex items-center justify-between relative z-10">
 <div className={cn("w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center", item.color)}>
 <item.icon className="w-5 h-5" />
 </div>
 <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">{item.label}</span>
 </div>
 <div className="flex flex-col relative z-10">
 <span dir="ltr" className="text-title-sm font-mono font-semibold text-foreground line-clamp-1">{item.value}</span>
 </div>
 </Card>
 ))}
 </div>

 <DocumentReadOnlyOverlay isPosted={true}>
 <Card className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm border-none">
 <div className="p-6 border-b border-outline-variant/50">
 <h3 className="text-body-md font-semibold text-foreground uppercase">{tCommon('order_details')}</h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-start border-collapse">
 <thead>
 <tr className="bg-surface-container-low/50 border-b border-outline-variant/50">
 <th className="px-6 py-4 text-label-xs font-semibold uppercase text-muted-foreground/50 text-start h-10">{tCommon('item')}</th>
 <th className="px-6 py-4 text-label-xs font-semibold uppercase text-muted-foreground/50 text-end h-10">{tCommon('quantity')}</th>
 <th className="px-6 py-4 text-label-xs font-semibold uppercase text-muted-foreground/50 text-end h-10">{t('unit_price')}</th>
 <th className="px-6 py-4 text-label-xs font-semibold uppercase text-muted-foreground/50 text-end h-10">{t('subtotal')}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-outline-variant/30">
 {po?.lines?.map((line: POLine, idx: number) => (
 <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors group">
 <td className="px-6 py-4">
 <div className="flex flex-col gap-0.5">
 <span dir="ltr" className="text-label-xs font-mono font-bold text-primary uppercase">{line.item_sku || line.item_id}</span>
 <span className="text-body-md font-bold text-foreground group-hover:text-primary transition-colors">{line.item_name || tCommon('not_available')}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-end">
 <span dir="ltr" className="font-mono text-label-sm font-bold text-foreground/80">
 {formatQuantity(line.quantity || line.qty || 0, locale)} {line.uom_id}
 </span>
 </td>
 <td className="px-6 py-4 text-end">
 <span dir="ltr" className="font-mono text-label-sm font-bold text-operational-cyan">
 {formatCurrency(line.unit_price || line.unit_cost_foreign || 0, po?.currency_id || 'USD', locale)}
 </span>
 </td>
 <td className="px-6 py-4 text-end">
 <span dir="ltr" className="font-mono text-body-md font-semibold text-foreground">
 {formatCurrency((line.quantity || line.qty || 0) * (line.unit_price || line.unit_cost_foreign || 0), po?.currency_id || 'USD', locale)}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <div className="p-8 bg-surface-container-low/30 border-t border-outline-variant/50 flex justify-end">
 <div className="flex items-center gap-10">
 <div className="flex flex-col items-end">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('order_total')}</p>
 <p dir="ltr" className="text-headline-lg font-mono font-semibold text-primary">
 {formatCurrency(po?.total || 0, po?.currency_id || 'USD', locale)}
 </p>
 </div>
 </div>
 </div>
 </Card>
 </DocumentReadOnlyOverlay>

 {timeline.length > 0 && (
 <Card className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border-none transition-all">
 <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-10">{t('ledger_history')}</h3>
 <StatusTimeline entries={timeline} />
 </Card>
 )}
 </div>
 )}
 </div>
 </div>
 );
}

