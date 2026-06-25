'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { useAdjustmentList, AdjustmentSummary } from '@/features/operations/hooks/useAdjustmentList';
import { useAdjustmentSummary } from '@/features/operations/hooks/useAdjustmentSummary';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, Activity, FileCheck, AlertTriangle, Filter, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { isAdjustmentPending } from '@/domain/status-guards';
import { ADJUSTMENT_STATUS_UI } from '@/domain/status-ui-map';
import { ADJUSTMENT_STATUS, type AdjustmentStatus, type DocumentStatus } from '@logirest/shared-types';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useAuth } from '@/providers/AuthProvider';
import { canPerformActionV2 } from '@logirest/shared-types';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api/client';
import { AdjustmentDetailSchema } from '@/features/operations/hooks/useAdjustment';
import { ExportMenu } from '@/components/shared/ExportMenu';

// Reason → Semantic visual styling (Hardened for LogiRest)
const REASON_CHIP: Record<string, string> = {
 DAMAGE: 'bg-status-error/10 text-status-error font-bold border border-status-error/5',
 EXPIRY: 'bg-status-warning/10 text-status-warning font-bold border border-status-warning/5',
 THEFT: 'bg-status-error/10 text-status-error font-bold border border-status-error/5',
 COUNTING_ERROR: 'bg-status-secondary/10 text-status-secondary font-bold border border-status-secondary/5',
 OTHER: 'bg-surface-container-highest/30 text-muted-foreground font-bold border border-outline-low/5',
};


export function AdjustmentListClient() {
const t = useTranslations('operations.adjustment');
 const tCommon = useTranslations('common');
 const tFilters = useTranslations('filters');
 const tb = useTranslations('batch');
 const locale = useLocale();
 const router = useRouter();
 const queryClient = useQueryClient();
 const { user } = useAuth();

 const { data: warehousesData } = useWarehouses();
 const warehouseMap = useMemo(() => {
  const list = warehousesData?.data ?? [];
  return new Map(list.map((w) => [w.id, w.name || '']));
 }, [warehousesData]);

 const warehouseItems = useMemo(() => {
  const list = warehousesData?.data ?? [];
  const allItem = {
   id: 'ALL',
   name_en: 'All Warehouses',
   name_ar: 'كل المستودعات',
   code: 'ALL',
  };
  const mapped = list.map((w) => ({
   id: w.id,
   name_en: w.name || '',
   name_ar: w.name || '',
   code: w.code,
  }));
  return [allItem, ...mapped];
 }, [warehousesData]);

 const exportColumns = useMemo(() => [
  { header: t('doc_number') || 'Document #', key: 'documentNumber' },
  { header: t('reason') || 'Reason', key: 'reason' },
  { header: tCommon('warehouse') || 'Warehouse', key: 'warehouseName' },
  { header: t('approved_by') || 'Approved By', key: 'approvedBy' },
  { header: tCommon('created_at') || 'Created At', key: 'createdAt' },
  { header: tCommon('status_label') || 'Status', key: 'status' }
 ], [t, tCommon]);

 const [page, setPage] = useState(1);
 const [status, setStatus] = useState<string>('');
 const [warehouseFilter, setWarehouseFilter] = useState('');
 const [search, setSearch] = useState('');
 const debouncedSearch = useDebounce(search, 500);
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [isBatchLoading, setIsBatchLoading] = useState(false);
 const [batchConfirmAction, setBatchConfirmAction] = useState<'approve' | 'post' | null>(null);

 const [showFilters, setShowFilters] = useState(true);
 const [dateFrom, setDateFrom] = useState<string>('');
 const [dateTo, setDateTo] = useState<string>('');
 const [sorting, setSorting] = useState<SortingState>([]);

 const { warehouseId } = useOperationalScope();

 const isWarehouseLocked = user?.role === 'WH_KEEPER' || user?.role === 'STORE_MGR';
 const effectiveWarehouseId = isWarehouseLocked ? (warehouseId || '') : warehouseFilter;

 const sortBy = sorting[0]?.id || undefined;
 const sortDir = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

 const activeFilterCount = useMemo(() => {
  let count = 0;
  if (status) count++;
  if (warehouseFilter && !isWarehouseLocked) count++;
  if (dateFrom) count++;
  if (dateTo) count++;
  return count;
 }, [status, warehouseFilter, isWarehouseLocked, dateFrom, dateTo]);

 const postAdjustment = usePostAdjustment();
 const approveAdjustment = useApproveAdjustment();

 const statusItems = useMemo(() => {
  const allItem = {
   id: 'ALL',
   name_en: tCommon('statuses.all') || 'All Statuses',
   name_ar: tCommon('statuses.all') || 'كل الحالات',
  };
  const statuses = Object.entries(ADJUSTMENT_STATUS_UI)
   .filter(([key]) => Object.values(ADJUSTMENT_STATUS).includes(key as AdjustmentStatus))
   .map(([key, config]) => ({
    id: key,
    name_en: tCommon(config.labelKey) || key,
    name_ar: tCommon(config.labelKey) || key,
   }));
  return [allItem, ...statuses];
 }, [tCommon]);

 const { data, isLoading } = useAdjustmentList({ status, search: debouncedSearch, page, warehouse_id: effectiveWarehouseId || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, sort_by: sortBy, sort_dir: sortDir });
 const { data: summaryData } = useAdjustmentSummary();

 const mappedData = useMemo(() => {
  const list = data?.data || [];
  return list.map(item => {
   const reasonLower = item.reason.toLowerCase();
   const reasonLabel = t.has(`reasons.${reasonLower}`) ? t(`reasons.${reasonLower}`) : item.reason;
   return {
    ...item,
    rawReason: item.rawReason || item.reason,
    reason: reasonLabel,
    warehouseName: item.warehouseName || warehouseMap.get(item.warehouseId) || '—',
   };
  });
 }, [data?.data, t, warehouseMap]);

 const allData = mappedData;
 const selectedItems = allData.filter(item => selectedIds.has(item.id));

 const handleBatchApprove = async () => {
  setIsBatchLoading(true);

  const eligible = selectedItems.filter(item =>
   canPerformActionV2('ADJUSTMENT', item.status as DocumentStatus, 'APPROVE', user?.role)
  );
  const skipped = selectedItems.length - eligible.length;
  if (skipped > 0) {
   toast.warning(tb('skipped_n_ineligible', { count: skipped }));
  }
  if (eligible.length === 0) {
   setIsBatchLoading(false);
   return;
  }

  const eligibleIds = eligible.map(item => item.id);
  const docs = await Promise.all(
   eligibleIds.map(id => apiClient.get(`/operations/adjustments/${id}`, AdjustmentDetailSchema).catch(() => null))
  );
  const versionMap = new Map<string, number>();
  const failures: { id: string; reason: string }[] = [];
  for (let i = 0; i < eligibleIds.length; i++) {
   const doc = docs[i];
   if (doc) {
    versionMap.set(eligibleIds[i], doc.version ?? 0);
   } else {
    failures.push({ id: eligibleIds[i], reason: 'unavailable' });
   }
  }

  let successCount = 0;
  for (const [id, version] of versionMap) {
   try {
    await approveAdjustment.mutateAsync({ id, version });
    successCount++;
   } catch { failures.push({ id, reason: 'approve_failed' }); }
  }
  setIsBatchLoading(false);
  setSelectedIds(new Set());
  queryClient.invalidateQueries({ queryKey: ['adjustments'] });
  if (successCount > 0) {
   toast.success(`${successCount} ${t('approve') || 'adjustments approved'}`);
  }
  if (failures.length > 0) {
   toast.error(`${failures.length} ${t('approve_failed') || 'adjustments failed'}: ${failures.map(f => f.id).join(', ')}`);
  }
 };

 const handleBatchPost = async () => {
  setIsBatchLoading(true);

  const eligible = selectedItems.filter(item =>
   canPerformActionV2('ADJUSTMENT', item.status as DocumentStatus, 'POST', user?.role)
  );
  const skipped = selectedItems.length - eligible.length;
  if (skipped > 0) {
   toast.warning(tb('skipped_n_ineligible', { count: skipped }));
  }
  if (eligible.length === 0) {
   setIsBatchLoading(false);
   return;
  }

  const eligibleIds = eligible.map(item => item.id);
  const docs = await Promise.all(
   eligibleIds.map(id => apiClient.get(`/operations/adjustments/${id}`, AdjustmentDetailSchema).catch(() => null))
  );
  const versionMap = new Map<string, number>();
  const failures: { id: string; reason: string }[] = [];
  for (let i = 0; i < eligibleIds.length; i++) {
   const doc = docs[i];
   if (doc) {
    versionMap.set(eligibleIds[i], doc.version ?? 0);
   } else {
    failures.push({ id: eligibleIds[i], reason: 'unavailable' });
   }
  }

  let successCount = 0;
  for (const [id, version] of versionMap) {
   try {
    await postAdjustment.mutateAsync({ id, version });
    successCount++;
   } catch { failures.push({ id, reason: 'post_failed' }); }
  }
  setIsBatchLoading(false);
  setSelectedIds(new Set());
  queryClient.invalidateQueries({ queryKey: ['adjustments'] });
  if (successCount > 0) {
   toast.success(`${successCount} ${t('post') || 'adjustments posted'}`);
  }
  if (failures.length > 0) {
   toast.error(`${failures.length} ${t('post_failed') || 'adjustments failed'}: ${failures.map(f => f.id).join(', ')}`);
  }
 };
 const columns = useMemo<ColumnDef<AdjustmentSummary>[]>(() => [
  {
   id: 'select',
   header: () => (
    <Checkbox
     checked={allData.length > 0 && selectedIds.size === allData.length}
     onCheckedChange={(checked) => {
      if (checked) {
       setSelectedIds(new Set(allData.map(r => r.id)));
      } else {
       setSelectedIds(new Set());
      }
     }}
    />
   ),
   cell: ({ row }) => (
    <div onClick={(e) => e.stopPropagation()}>
     <Checkbox
      checked={selectedIds.has(row.original.id)}
      onCheckedChange={(checked) => {
       const next = new Set(selectedIds);
       if (checked) {
        next.add(row.original.id);
       } else {
        next.delete(row.original.id);
       }
       setSelectedIds(next);
      }}
     />
    </div>
   ),
  },
  {
   accessorKey: 'status',
   header: tCommon('status_label'),
   meta: { sortBy: 'status' },
   cell: ({ row }) => (
    <StatusBadge status={row.original.status} />
   ),
  },
  {
   accessorKey: 'documentNumber',
   header: t('doc_number'),
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono text-status-active text-body-md font-semibold">
     {row.original.documentNumber}
    </span>
   ),
  },
  {
   accessorKey: 'reason',
   header: t('reason'),
   cell: ({ row }) => {
    const rawReason = (row.original.rawReason || row.original.reason || '').toUpperCase();
    const cls = REASON_CHIP[rawReason] ?? REASON_CHIP.OTHER;
    return (
     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-label-xxs uppercase ${cls}`}>
      {row.original.reason}
     </span>
    );
   },
  },
  {
   accessorKey: 'warehouseName',
   header: tCommon('warehouse'),
   cell: ({ row }) => {
    const display = row.original.warehouseName || '—';
    return <span className="opacity-80 font-medium">{display}</span>;
   },
  },
  {
   accessorKey: 'approvedBy',
   header: t('approved_by'),
   cell: ({ row }) =>
    row.original.approvedBy ? (
     <span className="inline-flex items-center gap-1.5 text-label-xs font-bold text-status-success">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {row.original.approvedBy}
     </span>
    ) : (
     <span className="inline-flex items-center gap-1.5 text-label-xs font-bold text-muted-foreground/30 italic">
      <Clock className="w-3.5 h-3.5" />
      {tCommon('statuses.pending')}
     </span>
    ),
  },
  {
   accessorKey: 'createdAt',
   header: tCommon('created_at'),
   meta: { sortBy: 'created_at' },
   cell: ({ row }) =>
    row.original.createdAt ? (
     <span dir="ltr" className="text-label-xs text-muted-foreground/40 font-mono font-medium">
      <ClientOnlyTime date={row.original.createdAt} mode="date" />
     </span>
    ) : <span className="opacity-20 text-label-xs">—</span>,
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end">
     <Button
      variant="ghost"
      size="sm"
      className="text-label-xs font-bold uppercase text-status-active hover:bg-status-active/10 h-8 px-4 rounded-md"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/adjustments/${row.original.id}`);
      }}
     >
      {tCommon('view')}
     </Button>
    </div>
   ),
  },
 ], [t, tCommon, router, selectedIds, allData, setSelectedIds, warehouseMap, locale]);

 const totalAdjustments = summaryData?.total ?? data?.meta?.total ?? 0;
 const pendingApprovalsCount = summaryData?.pending ?? 0;
 const majorAdjustmentsCount = summaryData?.criticalLosses ?? 0;

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex space-y-10 w-full">
   <Breadcrumb
    items={[
     { label: tCommon('inventory'), href: '#' },
     { label: t('title'), href: '/adjustments' }
    ]}
   />
   <PageHeader
    title={t('title')}
    subtitle={t('description') || 'Corrective inventory volume adjustments and audits'} children={
     <div className="flex items-center gap-6">
      <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-6 hidden md:flex min-w-0">
       <div className="text-label-xs font-semibold uppercase text-muted-foreground/60 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
        {tCommon('statuses.live_updates')}
       </div>
       <div dir="ltr" className="text-label-xxs font-bold text-muted-foreground/40">
        {tCommon('statuses.last_sync')}: <ClientOnlyTime locale={locale as 'ar' | 'en'} fallback="..." />
       </div>
      </div>
      <PermissionGate action="create" resource="adjustment">
       <Link href="/adjustments/new" className="shrink-0 w-full sm:w-auto">
        <Button className="h-10 px-8 bg-card border border-border shadow-sm border border-outline-low/10 text-status-active text-label-xs font-bold uppercase rounded-md transition-all hover:bg-surface-container-medium shadow-sm gap-2">
         <Plus className="w-3.5 h-3.5" />
         {t('create_new')}
        </Button>
       </Link>
      </PermissionGate>
     </div>
    }
   />

   {/* Summary Cards - Operational Nocturne Standard */}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <MetricCard
     label={t('correction_volume')}
     value={totalAdjustments}
     icon={Activity}
     trend="active"
    />
    <MetricCard
     label={t('pending_approval')}
     value={pendingApprovalsCount}
     icon={FileCheck}
     trend="active"
     color="amber"
    />
    <MetricCard
     label={t('critical_losses')}
     value={majorAdjustmentsCount}
     icon={AlertTriangle}
     trend="active"
     color="rose"
    />
   </div>

   {selectedIds.size > 0 && (
    <div className="flex items-center gap-4 px-6 py-4 bg-card border border-border shadow-sm/80 border border-outline-low/10 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
     <span className="text-label-xs font-bold text-muted-foreground/60">
      {selectedIds.size} {tCommon('selected')}
     </span>
     <div className="flex items-center gap-2 ms-auto">
      <Button size="sm" onClick={() => setBatchConfirmAction('approve')} disabled={isBatchLoading} className="h-9 px-5 text-label-xs font-bold uppercase bg-muted/50 hover:bg-muted/50 text-foreground border border-emerald-500/20">
       {isBatchLoading ? '...' : t('approve')}
      </Button>
      <Button size="sm" onClick={() => setBatchConfirmAction('post')} disabled={isBatchLoading} className="h-9 px-5 text-label-xs font-bold uppercase bg-muted/50 hover:bg-muted/50 text-foreground border border-cyan-500/20">
       {isBatchLoading ? '...' : t('post')}
      </Button>
     </div>
    </div>
   )}

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    {/* Unified Toolbar */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 w-full">
        <div className="relative w-full sm:w-80 md:w-96 group">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={tCommon('search') || "Search..."}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-11 ps-10 bg-background border border-border text-foreground focus:border-brand-gold rounded-xl transition-all shadow-sm"
          />
        </div>

        <SmartCombobox
          items={statusItems}
          value={status || 'ALL'}
          onSelect={(item) => { setStatus(item.id === 'ALL' ? '' : String(item.id)); setPage(1); }}
          placeholder={tCommon('statuses.all') || "All Statuses"}
          triggerClassName="w-full sm:w-[160px] bg-card border border-border/50 h-11 px-4 text-label-xs font-semibold uppercase rounded-xl shadow-sm whitespace-nowrap"
        />

        <SmartCombobox
          items={warehouseItems}
          value={isWarehouseLocked ? (warehouseId || '') : warehouseFilter}
          onSelect={(item) => { if (!isWarehouseLocked) { setWarehouseFilter(item.id === 'ALL' ? '' : String(item.id)); setPage(1); } }}
          placeholder={tFilters('warehouse')}
          disabled={isWarehouseLocked}
          triggerClassName="w-full sm:w-[180px] bg-card border border-border/50 h-11 px-4 text-label-xs font-semibold rounded-xl shadow-sm whitespace-nowrap"
        />
      </div>

      <div className="flex items-center justify-end shrink-0 gap-3 w-full sm:w-auto">
        <PermissionGate action="export" resource="adjustment">
          <ExportMenu
            data={allData}
            columns={exportColumns}
            filename="operations_adjustments"
            title="Inventory Adjustments Report"
            isCompactMobile={true}
          />
        </PermissionGate>
      </div>
    </div>

    <div className="hidden md:block w-full">
     <DataTable
      columns={columns}
      data={allData}
      isLoading={isLoading}
      onRowClick={(row: AdjustmentSummary) => router.push(`/adjustments/${row.id}`)}
      collectionName="operations_adjustments"
      sorting={sorting}
      onSortingChange={setSorting}
      enableExport={false}
      emptyState={
       <EmptyState
        variant="minimal"
        title={tCommon('datatable.no_records')} action={
         <PermissionGate action="create" resource="adjustment">
          <Button
           onClick={() => router.push('/adjustments/new')}
           className="bg-muted/50 hover:bg-muted/50 text-foreground border border-cyan-500/20"
          >
           <Plus className="w-4 h-4 me-2" />
           {t('create_new')}
          </Button>
         </PermissionGate>
        }
       />
      }
      pagination={data?.meta ? {
       page: page,
       pageSize: 10,
       total: data.meta.total,
       totalPages: data.meta.totalPages,
       onPageChange: setPage
      } : undefined}
     />
    </div>

    <div className="md:hidden flex flex-col gap-3 mt-4 pb-20">
     {isLoading ? (
      [...Array(3)].map((_, i) => (
       <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm animate-pulse h-28" />
      ))
     ) : allData && allData.length > 0 ? (
      allData.map((row) => {
       const rawReason = (row.rawReason || row.reason || '').toUpperCase();
       const reasonCls = REASON_CHIP[rawReason] ?? REASON_CHIP.OTHER;
       const reasonLabel = row.reason;
       const warehouseName = row.warehouseName || '—';

       return (
        <div key={row.id} className="bg-card border border-border rounded-xl flex flex-col shadow-sm relative overflow-hidden">
         {/* Identity & Status */}
         <div className="flex justify-between items-start p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2">
            <span dir="ltr" className="text-xs font-mono font-bold text-operational-cyan dark:text-[#b48e67]">{row.documentNumber}</span>
            <StatusBadge status={row.status} />
           </div>
           <span className="text-xs text-muted-foreground font-medium">{warehouseName}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
           <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase ${reasonCls}`}>
            {reasonLabel}
           </span>
          </div>
         </div>

         {/* Meta */}
         <div className="flex justify-between items-center p-3 py-2 bg-muted/30">
          <div className="flex items-center gap-1.5">
           {row.approvedBy ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-success">
             <CheckCircle2 className="w-3 h-3" />
             {row.approvedBy}
            </span>
           ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground/50 italic">
             <Clock className="w-3 h-3" />
             {tCommon('statuses.pending')}
            </span>
           )}
          </div>
          <span dir="ltr" className="text-[10px] text-muted-foreground/60 font-mono">
           <ClientOnlyTime date={row.createdAt} mode="date" />
          </span>
         </div>

         {/* Action Footer */}
         <div className="flex gap-2 px-3 py-2 border-t border-border/50">
          <button
           onClick={(e) => {
            e.stopPropagation();
            router.push(`/adjustments/${row.id}`);
           }}
           className="flex-1 h-9 flex items-center justify-center bg-muted/50 border border-border text-foreground text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-muted transition-colors"
          >
           {tCommon('view')}
          </button>
         </div>
        </div>
       );
      })
     ) : (
      <EmptyState
       variant="minimal"
       title={tCommon('datatable.no_records')}
       action={
        <PermissionGate action="create" resource="adjustment">
         <Button
          onClick={() => router.push('/adjustments/new')}
          className="bg-muted/50 hover:bg-muted/50 text-foreground border border-cyan-500/20"
         >
          <Plus className="w-4 h-4 me-2" />
          {t('create_new')}
         </Button>
        </PermissionGate>
       }
      />
     )}
    </div>
   </div>

   <PostConfirmDialog
    open={batchConfirmAction !== null}
    onOpenChange={(open) => { if (!open) setBatchConfirmAction(null); }}
    title={batchConfirmAction === 'approve' ? t('batch_approve_title') || 'Batch Approve' : t('batch_post_title') || 'Batch Post'}
    description={batchConfirmAction === 'approve'
     ? (t('batch_approve_desc') || `Approve ${selectedIds.size} selected adjustments?`)
     : (t('batch_post_desc') || `Post ${selectedIds.size} selected adjustments?`)}
    warningText={batchConfirmAction ? (t(`${batchConfirmAction}_irreversible`) || `This action is irreversible.`) : ''}
    requiresTextConfirmation={true}
    variant={batchConfirmAction === 'approve' ? 'default' : 'warning'}
    icon={batchConfirmAction === 'approve' ? 'info' : 'warning'}
    onConfirm={batchConfirmAction === 'approve' ? handleBatchApprove : handleBatchPost}
    isLoading={isBatchLoading}
   />
  </div>
 );
}
