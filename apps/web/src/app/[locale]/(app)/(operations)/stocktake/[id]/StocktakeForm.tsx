"use client"

import { Input } from '@/components/ui/input';
import * as React from "react";
import { RelationalName } from "@/components/shared/RelationalName";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ClientOnlyTime } from "@/components/shared/ClientOnlyTime";
import {
  Clock,
  Warehouse,
  User,
  ClipboardList,
  History,
  Search,
  Play
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentLineItemTable, type LineItem } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LockBanner } from "@/components/shared/LockBanner";
import { StatusTimeline, type Status } from "@/components/shared/StatusTimeline";
import { DocumentStatus } from "@/types/DocumentStatus";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { STOCKTAKE_STATUS } from "@logirest/shared-types";
import { isStocktakeCounting, isStocktakeInReview } from "@/domain/status-guards";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { DocumentExportMenu } from "@/components/shared/DocumentExportMenu";
import { StickyGlassHeader } from "@/components/shared/StickyGlassHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

import { DocumentLockBanner } from "@/components/shared/DocumentLockBanner";
import { FormFooter } from "@/components/layouts/FormLayout";

import { StocktakeSessionVM, StocktakeItemVM } from "@/features/operations/mappers/stocktakeMapper";

interface StocktakeFormProps {
  session: StocktakeSessionVM;
  locale: 'ar' | 'en';
  actions: React.ReactNode;
  isLocked?: boolean;
  onConflict?: (error: unknown) => void;
}

export function StocktakeForm({ session, locale, actions, isLocked = false, onConflict }: StocktakeFormProps) {
  const [manifestSearch, setManifestSearch] = React.useState('')
  const t = useTranslations('operations.stocktake')
  const common = useTranslations('common')
  const router = useRouter();
  const { user } = useAuth();
  const { data: lockState } = useWarehouseLock(session?.warehouseId ?? null);

  const status = session.status as DocumentStatus;
  const warehouseName = session.warehouseName;

  const isCounting = isStocktakeCounting(status) || status === STOCKTAKE_STATUS.STARTED;

  const filteredItems = React.useMemo(() => {
    if (!manifestSearch) return session.items
    const q = manifestSearch.toLowerCase()
    return session.items.filter(item =>
      item.itemName.toLowerCase().includes(q) || item.barcode?.includes(q)
    )
  }, [session.items, manifestSearch])

  interface StocktakeLineItem extends LineItem {
    snapshotQty: number | null;
    variance: number | null;
    countedQty: number | null;
    uom: string;
  }

  const tableLines = React.useMemo<StocktakeLineItem[]>(() => {
    return filteredItems.map((item) => ({
      id: item.id,
      item: {
        id: item.itemId,
        code: item.barcode || '',
        nameEn: item.itemName,
        nameAr: item.itemName,
        image: item.image || null,
        primaryUom: { code: item.uom }
      },
      qty: item.countedQty ?? 0,
      uomId: '',
      lot: item.lotNumber ? { lotNumber: item.lotNumber, expiryDate: item.expiryDate || null } : null,
      snapshotQty: item.snapshotQty,
      variance: item.variance,
      countedQty: item.countedQty,
      uom: item.uom
    }));
  }, [filteredItems]);

  return (
    <div className="min-h-screen pb-48 animate-in fade-in duration-500">
      {/* Sticky Glass Header */}
      <StickyGlassHeader
        title={
          <div className="flex flex-col gap-0.5">
            <Breadcrumb
              items={[
                { label: t('title'), href: `/stocktake` },
                { label: session.sessionName },
              ]}
            />
            <span>{session.sessionName}</span>
          </div>
        }
        statusBadge={
          <StatusBadge
            status={session.status}
            configMap={STOCKTAKE_STATUS_UI}
            className="h-6 px-2 text-label-xxs font-semibold border-none"
          />
        }
        actions={<DocumentExportMenu documentType="STOCKTAKE" documentId={session.id} documentNumber={session.sessionNumber} />}
        isEditing={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        <DocumentLockBanner
          status={session.status}
          isLocked={isLocked}
        />
        {lockState?.isLocked && (
          <LockBanner lockState={lockState} />
        )}

        {/* Form Content Wrapper with Visual Locking */}
        <div className={cn(
          "space-y-6 transition-all duration-500",
          isLocked && "opacity-80 grayscale-[0.2] select-none"
        )}>
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: common('warehouse'), value: <RelationalName name={warehouseName} rawId={session.warehouseId} />, icon: Warehouse, color: 'text-primary' },
              { label: t('owner'), value: session.postedBy || common('system_user'), icon: User, color: 'text-foreground' },
              { label: t('items_count'), value: `${session.items.length} ${t('skus')}`, icon: ClipboardList, color: 'text-rose-500' },
              { label: t('last_updated'), value: session.updatedAt ? <ClientOnlyTime date={session.updatedAt} mode="time" /> : common('dash'), icon: Clock, color: 'text-amber-500' },
            ].map((item, idx) => (
              <Card key={idx} className="p-5 bg-card border brand-gold/50 shadow-sm border-brand-gold/50 shadow-sm flex flex-col gap-3 rounded-xl relative overflow-hidden group">
                <div className="flex items-center justify-between relative z-10">
                  <div className={cn("w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-label-xxs font-semibold text-brand-gold/50 uppercase">{item.label}</span>
                </div>
                <div className="flex flex-col relative z-10">
                  <span className="text-title-sm font-semibold text-foreground line-clamp-1">{item.value}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary Table */}

          <div className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-body-md font-bold text-foreground">{t('inventory_manifest')}</h3>
              <p className="text-label-xs font-bold text-muted-foreground/50 uppercase">{t('items_to_audit')}</p>
            </div>
          </div>
          <div className="px-6 pb-3 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <Input
                type="text"
                value={manifestSearch}
                onChange={(e) => setManifestSearch(e.target.value)}
                placeholder={t('manifest_search_placeholder')}
                className="w-full ps-9 pe-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-[#0B1220] dark:border-gray-700 dark:text-white text-label-sm placeholder:text-gray-400 dark:placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
            </div>
            {manifestSearch && (
              <p className="text-label-xs font-semibold text-muted-foreground/50">
                {t('manifest_search_count', { filtered: filteredItems.length, total: session.items.length })}
              </p>
            )}
          </div>
          {filteredItems.length === 0 && manifestSearch ? (
            <div className="px-6 pb-8 text-center">
              <p className="text-label-sm text-muted-foreground/40">{common('no_results') || 'No matching items'}</p>
            </div>
          ) : status === 'DRAFT' && session.items.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center justify-center text-center gap-4 bg-muted/5 border border-border/10 rounded-2xl">
              <div className="p-4 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                <Play className="w-8 h-8 fill-current translate-x-[1px]" />
              </div>
              <div className="space-y-2 w-full">
                <h4 className="text-body-md font-bold text-foreground">
                  {locale === 'ar' ? 'مسودة جلسة الجرد فارغة' : 'Draft Stocktake Manifest is Empty'}
                </h4>
                <p className="text-label-sm text-muted-foreground w-full max-w-2xl mx-auto md:whitespace-nowrap leading-relaxed">
                  {locale === 'ar'
                    ? 'يرجى النقر فوق زر "بدء الجلسة" (أيقونة التشغيل) بالأسفل لأخذ اللقطة المخزنية وتجميد المستودع وبدء الجرد.'
                    : 'Click the "Start Session" (Play) button below to freeze the warehouse, take the initial stock snapshot, and begin counting.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DocumentLineItemTable<StocktakeLineItem>
                  lines={tableLines}
                  locale={locale}
                  isReadOnly={true}
                  hideLotColumns={true}
                  headers={{ qty: t('counted_qty') }}
                  renderQty={(line) => {
                    const hasCounted = line.countedQty !== null && line.countedQty !== undefined;
                    return hasCounted ? line.countedQty : common('dash');
                  }}
                  extraColumns={[
                    {
                      header: t('snapshot_qty'),
                      cell: (line) => !isCounting && line.snapshotQty !== null && line.snapshotQty !== undefined ? line.snapshotQty : common('dash')
                    },
                    {
                      header: t('variance'),
                      cell: (line) => {
                        const hasCounted = line.countedQty !== null && line.countedQty !== undefined;
                        const variance = line.variance ?? 0;
                        return !isCounting && hasCounted ? (
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl text-label-xs font-bold",
                            variance === 0 ? "bg-slate-100 dark:bg-slate-800 text-[#0B1220] dark:text-slate-400" :
                              variance > 0 ? "bg-amber-50/50 dark:bg-amber-950/10 text-[#b48e67]" : "bg-red-500/10 text-red-800/80 dark:text-red-400/80"
                          )} dir="ltr">
                            {variance > 0 ? '+' : ''}{variance}
                          </div>
                        ) : common('dash');
                      }
                    },
                    {
                      header: common('status_label'),
                      cell: (line) => {
                        const hasCounted = line.countedQty !== null && line.countedQty !== undefined;
                        return hasCounted ? (
                          <span className="inline-flex h-6 items-center justify-center px-2.5 rounded-full bg-[#b48e67]/15 text-[#b48e67] border border-[#b48e67]/30 text-label-xxs font-semibold uppercase">
                            {common('completed')}
                          </span>
                        ) : (
                          <span className="inline-flex h-6 items-center justify-center px-2.5 rounded-full bg-surface-container-highest text-muted-foreground/60 text-label-xxs font-semibold uppercase">
                            {common('pending')}
                          </span>
                        );
                      }
                    }
                  ]}
                />
              </div>

              <div className="flex flex-col gap-3 md:hidden w-full mt-4">
                {tableLines.map((line) => {
                  const hasCounted = line.countedQty !== null && line.countedQty !== undefined;
                  const variance = line.variance ?? 0;
                  const showVariance = !isCounting && hasCounted;
                  const snapshotVal = !isCounting && line.snapshotQty !== null && line.snapshotQty !== undefined ? line.snapshotQty : null;

                  return (
                    <div
                      key={line.id}
                      className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm flex flex-col gap-3 text-start"
                    >
                      {/* TOP TIER: Item Identity & Status */}
                      <div className="flex justify-between items-start border-b border-gray-50 dark:border-gray-800/50 pb-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-black text-[#0B1220] dark:text-white truncate">
                            {line.item.nameEn}
                          </span>
                          <span className="text-[10px] text-[#b48e67] font-medium font-mono tracking-widest mt-0.5">
                            {line.item.code || '—'}
                          </span>
                        </div>
                        {/* Render the COMPLETED / PENDING status badge here */}
                        <div className="scale-90 origin-top-right shrink-0">
                          {hasCounted ? (
                            <span className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-full bg-[#b48e67]/15 text-[#b48e67] border border-[#b48e67]/30">
                              {common('completed')}
                            </span>
                          ) : (
                            <Badge variant="outline" className="bg-surface-container-highest text-muted-foreground/60 border-none text-label-xxs font-semibold uppercase h-6">
                              {common('pending')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* BOTTOM TIER: The Audit Grid (Snapshot vs Counted vs Variance) */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* System Snapshot */}
                        <div className="flex flex-col bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                          <span className="text-xs font-black text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">SNAPSHOT</span>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums" dir="ltr">
                            {snapshotVal !== null ? (
                              <>
                                {snapshotVal} <span className="text-[9px]">{line.uom}</span>
                              </>
                            ) : '—'}
                          </span>
                        </div>

                        {/* Actual Counted (Highlighted) */}
                        <div className="flex flex-col bg-[#b48e67]/5 p-2 rounded-lg border border-[#b48e67]/30">
                          <span className="text-xs font-black text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">COUNTED</span>
                          <span className="text-xs font-black text-[#0B1220] dark:text-white tabular-nums" dir="ltr">
                            {hasCounted ? (
                              <>
                                {line.countedQty} <span className="text-[9px]">{line.uom}</span>
                              </>
                            ) : '—'}
                          </span>
                        </div>

                        {/* Variance */}
                        <div className="flex flex-col bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                          <span className="text-xs font-black text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1">VARIANCE</span>
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              !showVariance ? 'text-gray-400 font-bold' :
                                variance < 0 ? 'text-red-600 dark:text-red-400 font-black' :
                                  variance > 0 ? 'text-emerald-600 dark:text-emerald-400 font-black' :
                                    'text-gray-400 font-bold'
                            )}
                            dir="ltr"
                          >
                            {showVariance ? (
                              <>
                                {variance > 0 ? `+${variance}` : variance} <span className="text-[9px]">{line.uom}</span>
                              </>
                            ) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Status Timeline */}
          <div className="bg-card border border-border shadow-sm p-8 rounded-2xl shadow-sm transition-all hover:bg-card border border-border shadow-sm/50">
            <div className="flex items-center gap-3 mb-10">
              <History className="w-4 h-4 text-primary opacity-20" />
              <h3 className="text-label-xs font-semibold uppercase text-primary/30">{common('audit_trail') || 'Audit Trail'}</h3>
            </div>
            {(() => {
              const timeline = (session.auditLog ?? []).map(log => ({
                status: log.status.toLowerCase() as Status,
                at: log.createdAt,
                by: log.userName || common('system_user'),
              }));
              if (timeline.length === 0) {
                timeline.push({ status: 'draft' as Status, at: session.createdAt || new Date().toISOString(), by: session.startedBy || common('system_user') });
              }
              return <StatusTimeline entries={timeline} />;
            })()}
          </div>
        </div>

        <FormFooter
          onCancel={() => router.push('/stocktake')}
          isLocked={isLocked}
          isDirty={false}
          actions={actions}
        />
      </div>
    </div>
  )
}
