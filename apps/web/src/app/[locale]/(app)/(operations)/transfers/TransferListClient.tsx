'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { useTransferList, TransferSummary } from '@/features/operations/hooks/useTransferList';
import { useTransferSummary } from '@/features/operations/hooks/useTransferSummary';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Repeat, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { isTransferPosted } from '@/domain/status-guards';
import { getStatusConfig } from '@/domain/status-ui-map';
import { TRANSFER_STATUS } from '@logirest/shared-types';

export function TransferListClient() {
  const t = useTranslations('operations.transfer');
  const tCommon = useTranslations('common');
  const tFilters = useTranslations('filters');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();

  const { data: warehousesData } = useWarehouses();
  const warehouseMap = useMemo(() => {
    const list = warehousesData?.data ?? [];
    return new Map(list.map((w: { id: string; name_en: string; name_ar: string }) => [w.id, { name_en: w.name_en, name_ar: w.name_ar }]));
  }, [warehousesData]);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [showFilters, setShowFilters] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const sortBy = sorting[0]?.id || undefined;
  const sortDir = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (status) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [status, dateFrom, dateTo]);

  const statusItems = useMemo(() => {
    const allItem = {
      id: 'ALL',
      name_en: tCommon('statuses.all') || 'All Statuses',
      name_ar: tCommon('statuses.all') || 'كل الحالات',
    };
    const statuses = Object.entries(TRANSFER_STATUS).map(([, value]) => {
      const config = getStatusConfig(value);
      return {
        id: value,
        name_en: tCommon(config.labelKey) || value,
        name_ar: tCommon(config.labelKey) || value,
      };
    });
    return [allItem, ...statuses];
  }, [tCommon]);

  const { data, isLoading } = useTransferList({ status, page, search: debouncedSearch, date_from: dateFrom || undefined, date_to: dateTo || undefined, sort_by: sortBy, sort_dir: sortDir });
  const { data: summaryData } = useTransferSummary();
  useOperationalScope();

  const columns = useMemo<ColumnDef<TransferSummary>[]>(() => [
    {
      accessorKey: 'transfer_status',
      header: tCommon('status_label'),
      meta: { sortBy: 'status' },
      cell: ({ row }) => <StatusBadge status={row.original.transfer_status} />,
    },
    {
      accessorKey: 'document_number',
      header: tCommon('doc_number'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-cyan-500/90 font-semibold text-body-md">
          {row.original.document_number}
        </span>
      ),
    },
    {
      accessorKey: 'from_warehouse_id',
      header: t('from_warehouse'),
      cell: ({ row }) => {
        const name = warehouseMap.get(row.original.from_warehouse_id);
        const display = name ? (locale === 'ar' ? name.name_ar : name.name_en) : row.original.from_warehouse_id;
        return (
          <span className="opacity-80 font-medium">
            {display}
          </span>
        );
      },
    },
    {
      accessorKey: 'to_warehouse_id',
      header: t('to_warehouse'),
      cell: ({ row }) => {
        const name = warehouseMap.get(row.original.to_warehouse_id);
        const display = name ? (locale === 'ar' ? name.name_ar : name.name_en) : row.original.to_warehouse_id;
        return (
          <span className="opacity-80 font-medium">
            {display}
          </span>
        );
      },
    },
    {
      accessorKey: 'shipped_at',
      header: t('shipped_at'),
      meta: { sortBy: 'shipped_at' },
      cell: ({ row }) => (
        <ClientOnlyTime
          date={row.original.shipped_at}
          mode="date"
          locale={locale}
          className="text-label-xs opacity-60 font-mono font-medium"
        />
      ),
    },
    {
      accessorKey: 'created_at',
      header: tCommon('created_at'),
      meta: { sortBy: 'created_at' },
      cell: ({ row }) => (
        <ClientOnlyTime
          date={row.original.created_at}
          mode="date"
          locale={locale}
          className="text-label-xs opacity-60 font-mono font-medium"
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-500 hover:bg-cyan-500/10 h-7"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/transfers/${row.original.id}`);
            }}
          >
            {tCommon('view') || 'Inspect'}
          </Button>
        </div>
      ),
    },
  ], [t, tCommon, router, warehouseMap, locale]);

  const totalTransfersCount = summaryData?.total ?? data?.meta?.total ?? 0;
  const inTransitCount = summaryData?.in_transit ?? 0;
  const completedCount = data?.data?.filter(i => isTransferPosted(i.transfer_status)).length ?? 0;

  const overdueCount = summaryData?.overdue_count ?? 0;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb
        items={[
          { label: tCommon('modules.operations'), href: `/transfers` },
          { label: t('title') }
        ]}
      />

      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-label-xs font-bold uppercase text-amber-500">
              {overdueCount} {overdueCount === 1 ? t('transfer') : tCommon('items')} {t('overdue_transfer') || 'in-transit overdue'}
            </p>
            <p className="text-label-xxs font-medium text-amber-500/70 mt-0.5">
              {t('resolve_overdue_transfers') || 'Resolve overdue transfers'}
            </p>
          </div>
        </div>
      )}

      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-6 hidden md:flex">
              <div className="text-label-xs font-semibold uppercase text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                {tCommon('statuses.live_updates')}
              </div>
              <div className="text-label-xxs font-semibold text-muted-foreground/40 whitespace-nowrap" dir="ltr">
                {tCommon('statuses.last_sync')}: <ClientOnlyTime locale={locale} fallback="..." />
              </div>
            </div>
            <PermissionGate action="create" resource="transfer">
              <Link href="/transfers/new">
                <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-md transition-all shadow-lg shadow-cyan-900/10 whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {t('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={t('total_transfers')}
          value={totalTransfersCount}
          icon={Repeat}
          trend="active"
        />
        <MetricCard
          label={tCommon('statuses.in_transit')}
          value={inTransitCount}
          icon={Truck}
          trend="active"
          color="amber"
        />
        <MetricCard
          label={t('completed')}
          value={completedCount}
          icon={CheckCircle}
          trend="active"
          color="emerald"
        />
      </div>

      <div className="bg-surface-container-lowest rounded-lg border border-outline-low/5 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          onRowClick={(row: TransferSummary) => router.push(`/transfers/${row.id}`)}
          collectionName="operations_transfers"
          enableVirtualization={true}
          containerHeight="600px"
          sorting={sorting}
          onSortingChange={setSorting}
          emptyState={
            <EmptyState
              variant="minimal"
              title={tCommon('datatable.no_records')}

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
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-6 w-full py-6 px-8 bg-surface-container-low/50 border border-outline-low/10 rounded-xl ambient-shadow backdrop-blur-sm overflow-x-auto no-scrollbar">
                <div className="flex flex-col gap-2 min-w-[240px] flex-1">
                  <label htmlFor="status-select" className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{tCommon('status_label')}</label>
                  <SmartCombobox
                    items={statusItems}
                    value={status || 'ALL'}
                    onSelect={(item) => {
                      const nextStatus = item.id === 'ALL' ? '' : String(item.id);
                      setStatus(nextStatus);
                      setPage(1);
                    }}
                    placeholder={tCommon('statuses.all') || "All Statuses"}
                    triggerClassName="w-full bg-surface-container-highest/40 border-none h-12 px-4 text-label-sm font-semibold rounded-md transition-all hover:bg-surface-container-highest/60 focus:ring-1 focus:ring-cyan-500/10 shadow-inner shadow-black/5"
                  />
                </div>

                <div className="flex flex-col gap-2 min-w-[300px] flex-[2]">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ms-1">{tCommon('search')}</label>
                  <div className="relative group">
                    <Input
                      placeholder={t('search_placeholder')}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-surface-container-highest/40 border-none h-12 ps-12 pe-4 text-label-sm font-semibold rounded-md transition-all group-hover:bg-surface-container-highest/60 focus:ring-1 focus:ring-cyan-500/10 shadow-inner shadow-black/5"
                    />
                    <svg className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 transition-colors group-hover:text-cyan-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>

                <Button
                  className="h-12 px-8 bg-surface-container-highest/30 hover:bg-surface-container-highest/50 text-foreground text-label-xs font-semibold uppercase rounded-md transition-all border border-outline-low/10 shadow-sm group"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-3.5 h-3.5 me-2 transition-transform group-hover:rotate-180" />
                  {tCommon('filters_button')}
                  {activeFilterCount > 0 && (
                    <span className="ms-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-label-xxs font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              {showFilters && (
                <div className="flex items-center gap-6 px-8 py-4 bg-surface-container-low/30 border border-outline-low/5 rounded-lg">
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">{tFilters('date_from')}</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="bg-surface-container-highest/20 border border-outline-low/10 h-10 px-3 text-label-xs font-medium rounded-md text-foreground focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">{tFilters('date_to')}</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="bg-surface-container-highest/20 border border-outline-low/10 h-10 px-3 text-label-xs font-medium rounded-md text-foreground focus:ring-1 focus:ring-cyan-500/20 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>
    </div>
  );
}
