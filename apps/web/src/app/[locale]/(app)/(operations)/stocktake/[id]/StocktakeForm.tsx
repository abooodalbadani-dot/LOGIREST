"use client"

import * as React from "react";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
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
  Search
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentLineItemTable } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { LockBanner } from "@/components/shared/LockBanner";
import { StatusTimeline, type Status } from "@/components/shared/StatusTimeline";
import { DocumentStatus } from "@/types/DocumentStatus";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { STOCKTAKE_STATUS } from "@/contracts/statuses";
import { isStocktakeCounting, isStocktakeInReview } from "@/domain/status-guards";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { DocumentExportMenu } from "@/components/shared/DocumentExportMenu";
import { StickyGlassHeader } from "@/components/shared/StickyGlassHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";

import { DocumentLockBanner } from "@/components/shared/DocumentLockBanner";
import { FormFooter } from "@/components/shared/FormFooter";

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
  const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const { data: lockState } = useWarehouseLock(session?.warehouseId ?? null);

  const status = session.status as DocumentStatus;
  const warehouse = warehouses?.find(w => w.id === session.warehouseId);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.name_ar : warehouse.name_en) : (session.warehouseName || session.warehouseId);

  const isCounting = isStocktakeCounting(status) || status === STOCKTAKE_STATUS.STARTED;

  const filteredItems = React.useMemo(() => {
    if (!manifestSearch) return session.items
    const q = manifestSearch.toLowerCase()
    return session.items.filter(item =>
      item.itemName.toLowerCase().includes(q) || item.barcode?.includes(q)
    )
  }, [session.items, manifestSearch])

  const tableLines = React.useMemo(() => {
    return filteredItems.map((item) => ({
      id: item.id,
      item: {
        id: item.itemId,
        code: item.barcode || '',
        name_en: item.itemName,
        name_ar: item.itemName,
        primary_uom: { code: item.uom }
      },
      qty: item.countedQty ?? 0,
      uom_id: '',
      lot: item.lotNumber ? { lot_number: item.lotNumber, expiry_date: item.expiryDate || null } : null,
      snapshotQty: item.snapshotQty,
      variance: item.variance,
      countedQty: item.countedQty,
      uom: item.uom
    }));
  }, [filteredItems]);

  return (
    <div className="min-h-screen bg-surface-container-low pb-48 animate-in fade-in duration-500">
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
        actions={<DocumentExportMenu />}
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
          isLocked && "opacity-60 grayscale-[0.2] pointer-events-none select-none"
        )}>
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: common('warehouse'), value: warehouseName, icon: Warehouse, color: 'text-primary' },
              { label: t('owner'), value: session.postedBy || common('system_user'), icon: User, color: 'text-emerald-500' },
              { label: t('items_count'), value: `${session.items.length} ${t('skus')}`, icon: ClipboardList, color: 'text-rose-500' },
              { label: t('last_updated'), value: session.updatedAt ? <ClientOnlyTime date={session.updatedAt} mode="time" /> : common('dash'), icon: Clock, color: 'text-amber-500' },
            ].map((item, idx) => (
              <Card key={idx} className="p-5 bg-surface-container-lowest border-none shadow-sm flex flex-col gap-3 group transition-all rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className={cn("w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">{item.label}</span>
                </div>
                <div className="flex flex-col relative z-10">
                  <span className="text-title-sm font-semibold text-foreground line-clamp-1">{item.value}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary Table */}
          <Card className="bg-surface-container-lowest border-none shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-body-md font-semibold text-foreground">{t('inventory_manifest')}</h3>
                <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase">{t('items_to_audit')}</p>
              </div>
            </div>
            <div className="px-6 pb-3 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input
                  type="text"
                  value={manifestSearch}
                  onChange={(e) => setManifestSearch(e.target.value)}
                  placeholder={t('manifest_search_placeholder')}
                  className="w-full ps-9 pe-3 py-2 rounded-xl bg-surface-container-low border border-border/40 text-label-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
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
            ) : (
            <DocumentLineItemTable
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
                        variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
                        variance > 0 ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-500"
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
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-none text-label-xxs font-semibold uppercase h-6">
                        {common('completed')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-surface-container-highest text-muted-foreground/60 border-none text-label-xxs font-semibold uppercase h-6">
                        {common('pending')}
                      </Badge>
                    );
                  }
                }
              ]}
            />
            )}
          </Card>
          {/* Status Timeline */}
          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm transition-all hover:bg-surface-container-low/50">
            <div className="flex items-center gap-3 mb-10">
              <History className="w-4 h-4 text-primary opacity-20" />
              <h3 className="text-label-xs font-semibold uppercase text-primary/30">{common('audit_trail') || 'Audit Trail'}</h3>
            </div>
            {(() => {
              const timeline = (session.auditLog ?? []).map(log => ({
                status: log.status.toLowerCase() as Status,
                at: log.created_at,
                by: log.user_name || common('system_user'),
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
