'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useAdjustmentList, AdjustmentSummary } from '@/features/operations/hooks/useAdjustmentList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, Activity, FileCheck, AlertTriangle, Filter, RotateCcw } from 'lucide-react';
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
import { ADJUSTMENT_STATUS, type AdjustmentStatus, type DocumentStatus } from '@/contracts/statuses';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { useAuth } from '@/providers/AuthProvider';
import { canPerformActionV2 } from '@/core/workflow/document-engine';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api/client';
import { AdjustmentDetailSchema } from '@/features/operations/hooks/useAdjustment';

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
  const tb = useTranslations('batch');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: warehousesData } = useWarehouses();
  const warehouseMap = useMemo(() => {
    const list = warehousesData?.data ?? [];
    return new Map(list.map((w: { id: string; name_en: string; name_ar: string }) => [w.id, { name_en: w.name_en, name_ar: w.name_ar }]));
  }, [warehousesData]);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [batchConfirmAction, setBatchConfirmAction] = useState<'approve' | 'post' | null>(null);

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

  const { data, isLoading } = useAdjustmentList({ status, search: debouncedSearch, page });

  const allData = data?.data || [];
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
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
    },
    {
      accessorKey: 'document_number',
      header: t('doc_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-status-active text-body-md font-semibold">
          {row.original.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: t('reason'),
      cell: ({ row }) => {
        const reason = row.original.reason.toLowerCase();
        const cls = REASON_CHIP[row.original.reason as keyof typeof REASON_CHIP] ?? REASON_CHIP.OTHER;
        const label = t.has(`reasons.${reason}`) ? t(`reasons.${reason}`) : row.original.reason;
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-label-xxs uppercase ${cls}`}>
            {label}
          </span>
        );
      },
    },
    {
      accessorKey: 'warehouse_id',
      header: tCommon('warehouse'),
      cell: ({ row }) => {
        const name = warehouseMap.get(row.original.warehouse_id);
        const display = name ? (locale === 'ar' ? name.name_ar : name.name_en) : row.original.warehouse_id;
        return <span className="opacity-80 font-medium">{display}</span>;
      },
    },
    {
      accessorKey: 'approved_by',
      header: t('approved_by'),
      cell: ({ row }) =>
        row.original.approved_by ? (
          <span className="inline-flex items-center gap-1.5 text-label-xs font-bold text-status-success">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {row.original.approved_by}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-label-xs font-bold text-muted-foreground/30 italic">
            <Clock className="w-3.5 h-3.5" />
            {tCommon('statuses.pending')}
          </span>
        ),
    },
    {
      accessorKey: 'created_at',
      header: tCommon('created_at'),
      cell: ({ row }) =>
        row.original.created_at ? (
          <span dir="ltr" className="text-label-xs text-muted-foreground/40 font-mono font-medium">
            <ClientOnlyTime date={row.original.created_at} mode="date" />
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

  const totalAdjustments = data?.meta?.total || 0;
  const inProgressCount = data?.data?.filter(i => isAdjustmentPending(i.status)).length || 0;
  const majorAdjustmentsCount = data?.data?.filter(a => a.reason === 'DAMAGE' || a.reason === 'THEFT').length || 0;
  const pendingApprovalsCount = inProgressCount;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb
        items={[
          { label: tCommon('inventory'), href: '#' },
          { label: t('title'), href: '/adjustments' }
        ]}
      />
      <PageHeader
        title={t('title')}
        description={t('description') || 'Corrective inventory volume adjustments and audits'} actions={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-6 hidden md:flex">
              <div className="text-label-xs font-semibold uppercase text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                {tCommon('statuses.live_updates')}
              </div>
              <div dir="ltr" className="text-label-xxs font-bold text-muted-foreground/40">
                {tCommon('statuses.last_sync')}: <ClientOnlyTime locale={locale as 'ar' | 'en'} fallback="..." />
              </div>
            </div>
            <PermissionGate action="create" resource="adjustment">
              <Link href="/adjustments/new">
                <Button className="h-10 px-8 bg-surface-container-low border border-outline-low/10 text-status-active text-label-xs font-bold uppercase rounded-md transition-all hover:bg-surface-container-medium shadow-sm gap-2">
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
        <div className="flex items-center gap-4 px-6 py-4 bg-surface-container-low/80 border border-outline-low/10 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-label-xs font-bold text-muted-foreground/60">
            {selectedIds.size} {tCommon('selected')}
          </span>
          <div className="flex items-center gap-2 ms-auto">
            <Button size="sm" onClick={() => setBatchConfirmAction('approve')} disabled={isBatchLoading} className="h-9 px-5 text-label-xs font-bold uppercase bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20">
              {isBatchLoading ? '...' : t('approve')}
            </Button>
            <Button size="sm" onClick={() => setBatchConfirmAction('post')} disabled={isBatchLoading} className="h-9 px-5 text-label-xs font-bold uppercase bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/20">
              {isBatchLoading ? '...' : t('post')}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onRowClick={(row: AdjustmentSummary) => router.push(`/adjustments/${row.id}`)}
        collectionName="operations_adjustments"
        emptyState={
          <EmptyState
            variant="minimal"
            title={tCommon('datatable.no_records')} action={
              <PermissionGate action="create" resource="adjustment">
                <Button
                  onClick={() => router.push('/adjustments/new')}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 border border-cyan-500/20"
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
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex items-center gap-6 w-full py-6 px-8 bg-surface-container-low/50 border border-outline-low/10 rounded-xl ambient-shadow backdrop-blur-sm overflow-x-auto no-scrollbar">
            <div className="flex flex-col gap-2.5 min-w-[240px] flex-1">
              <label className="text-label-xs font-bold uppercase text-muted-foreground/40 ms-1">{tCommon('status_label')}</label>
              <SmartCombobox
                items={statusItems}
                value={status || 'ALL'}
                onSelect={(item) => {
                  const nextStatus = item.id === 'ALL' ? '' : item.id;
                  setStatus(nextStatus);
                  setPage(1);
                }}
                placeholder={tCommon('statuses.all') || "All Statuses"}
                triggerClassName="w-full bg-surface-container-highest/20 border-none h-12 px-5 text-label-xs font-bold uppercase rounded-md transition-all hover:bg-surface-container-highest/30 focus:ring-1 focus:ring-status-active/20 shadow-inner shadow-black/5"
              />
            </div>

            <div className="flex flex-col gap-2.5 min-w-[300px] flex-[2]">
              <label className="text-label-xs font-bold uppercase text-muted-foreground/40 ms-1">{tCommon('search')}</label>
              <div className="relative group">
                <Input
                  placeholder={t('search_placeholder') || 'Search Adjustment Documents...'}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/20 border-none h-12 ps-12 pe-4 text-label-xs font-bold rounded-md transition-all group-hover:bg-surface-container-highest/30 focus:ring-1 focus:ring-status-active/20 placeholder:text-muted-foreground/20 shadow-inner shadow-black/5"
                />
                <svg className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-status-active/40 transition-colors group-hover:text-status-active/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <Button className="h-12 px-8 bg-surface-container-highest/30 hover:bg-surface-container-highest/50 text-foreground text-label-xs font-bold uppercase rounded-md transition-all border border-outline-low/10 shadow-sm group">
              <Filter className="w-3.5 h-3.5 me-2 transition-transform group-hover:rotate-180 text-status-active/60" />
              {tCommon('filters_button')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-12 px-4 text-muted-foreground/60 hover:text-foreground text-label-xs font-bold uppercase rounded-md transition-all"
              onClick={() => { setStatus(''); setPage(1); }}
            >
              <RotateCcw className="w-3.5 h-3.5 me-2" />
              {tCommon('clear_filters') || 'Clear Filters'}
            </Button>
          </div>
        }
      />

      <PostConfirmDialog
        open={batchConfirmAction !== null}
        onOpenChange={(open) => { if (!open) setBatchConfirmAction(null); }}
        title={batchConfirmAction === 'approve' ? t('batch_approve_title') || 'Batch Approve' : t('batch_post_title') || 'Batch Post'}
        description={batchConfirmAction === 'approve'
          ? (t('batch_approve_desc') || `Approve ${selectedIds.size} selected adjustments?`)
          : (t('batch_post_desc') || `Post ${selectedIds.size} selected adjustments?`)}
        warningText={t(`${batchConfirmAction}_irreversible`) || `This action is irreversible.`}
        requiresTextConfirmation={true}
        variant={batchConfirmAction === 'approve' ? 'default' : 'warning'}
        icon={batchConfirmAction === 'approve' ? 'info' : 'warning'}
        onConfirm={batchConfirmAction === 'approve' ? handleBatchApprove : handleBatchPost}
        isLoading={isBatchLoading}
      />
    </div>
  );
}
