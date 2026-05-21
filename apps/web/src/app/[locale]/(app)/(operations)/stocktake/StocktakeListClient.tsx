'use client';
 
import { useMemo, useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { useDebounce } from '@/hooks/useDebounce';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useStocktakeList, StocktakeSummary } from '@/features/operations/hooks/useStocktakeList';
import { useStocktakeSummary } from '@/features/operations/hooks/useStocktakeSummary';
import { useOperationalScope } from '@/hooks/useOperationalScope';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, ClipboardCheck, AlertCircle, Plus, Filter, Search, Warehouse, Calendar, History, RotateCcw } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { isStocktakeInProgress, isStocktakePosted } from '@/domain/status-guards';
import { STOCKTAKE_STATUS_UI, getStatusConfig } from '@/domain/status-ui-map';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { QueryBoundary } from '@/core/query/QueryBoundary';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { STOCKTAKE_STATUS } from '@logirest/shared-types';

export function StocktakeListClient({
 initialStatus,
 initialPage,
 initialWarehouseId,
 locale
}: {
 initialStatus?: string;
 initialPage: number;
 initialWarehouseId?: string;
 locale: 'ar' | 'en'
}) {
const t = useTranslations('operations.stocktake');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tc = useTranslations('common');
  const tFilters = useTranslations('filters');

  const { data: warehousesData } = useWarehouses();
  const warehouseMap = useMemo(() => {
    const list = warehousesData?.data ?? [];
    return new Map(list.map((w: { id: string; name_en: string; name_ar: string }) => [w.id, { name_en: w.name_en, name_ar: w.name_ar }]));
  }, [warehousesData]);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [showFilters, setShowFilters] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const sortBy = sorting[0]?.id || undefined;
  const sortDir = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (initialStatus && initialStatus !== 'ALL') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [initialStatus, dateFrom, dateTo]);

 const statusItems = useMemo(() => {
   const allItem = {
     id: 'ALL',
     name_en: tc('statuses.all') || 'All Statuses',
     name_ar: tc('statuses.all') || 'كل الحالات',
   };
   const statuses = Object.values(STOCKTAKE_STATUS).map((value) => {
     const config = getStatusConfig(value, STOCKTAKE_STATUS_UI);
     return {
       id: value,
       name_en: tc(config.labelKey) || value,
       name_ar: tc(config.labelKey) || value,
     };
   });
   return [allItem, ...statuses];
 }, [tc]);

const { data, isLoading } = useStocktakeList({
    status: initialStatus,
    warehouse_id: initialWarehouseId,
    search: debouncedSearch || undefined,
    page: initialPage,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sort_by: sortBy,
    sort_dir: sortDir
    });
  const { data: summaryData } = useStocktakeSummary();
  const { warehouseId } = useOperationalScope();

 const handleStatusChange = (val: string | null) => {
 const params = new URLSearchParams(searchParams.toString());
 if (val && val !== 'ALL') {
 params.set('status', val);
 } else {
 params.delete('status');
 }
 params.set('page', '1');
 router.push(`${pathname}?${params.toString()}`);
 };

 const handlePageChange = (newPage: number) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set('page', newPage.toString());
 router.push(`${pathname}?${params.toString()}`);
 };

 const columns = useMemo<ColumnDef<StocktakeSummary>[]>(() => [
{
  accessorKey: 'session_number',
  header: t('session_number') || 'Session',
  meta: { sortBy: 'snapshot_at' },
  cell: ({ row }) => (
 <div className="flex flex-col">
 <span dir="ltr" className="font-mono text-body-md font-semibold text-cyan-500 group-hover:text-cyan-400 transition-colors">
 {row.original.session_number}
 </span>
 <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">
 Operational Audit
 </span>
 <div className="flex items-center gap-1.5 opacity-20 mt-1">
 <Calendar className="w-2.5 h-2.5" />
 <ClientOnlyTime 
 date={row.original.snapshot_at} 
 mode="datetime" 
 locale={locale as 'ar' | 'en'}
 className="text-label-xxs font-semibold tabular-nums"
 />
 </div>
 </div>
 ),
 },
 {
  accessorKey: 'warehouse_id',
  header: tc('warehouse') || 'Warehouse',
  cell: ({ row }) => {
    const name = warehouseMap.get(row.original.warehouse_id);
    const display = name ? (locale === 'ar' ? name.name_ar : name.name_en) : row.original.warehouse_id;
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-surface-container-highest/30 flex items-center justify-center border border-outline-low">
          <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <span className="font-bold text-label-sm text-foreground/80">{display}</span>
      </div>
    );
  },
 },
  {
  id: 'progress',
  header: t('items_counted') || 'Progress',
  cell: ({ row }) => {
    const total = row.original.total_items || 0;
    const counted = row.original.counted_items || 0;
    const pct = total > 0 ? Math.round((counted / total) * 100) : 0;
    return (
      <div className="flex flex-col gap-1.5 min-w-[140px]">
        <div className="flex items-center justify-between text-label-xxs font-semibold text-muted-foreground/60">
          <span>{counted}/{total} {t('items_count')}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-2 bg-surface-container-highest/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  },
  },
  {
  accessorKey: 'status',
  header: tc('status_label') || 'State',
  meta: { sortBy: 'status' },
  cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end pe-4">
 <Button
 variant="ghost"
 size="sm"
 className="h-8 px-4 text-label-xxs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-md group/btn transition-all"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/stocktake/${row.original.id}`);
 }}
 >
 {tc('view') || 'Inspect'}
 <Plus className="w-3 h-3 ms-2 group-hover/btn:rotate-90 transition-transform" />
 </Button>
 </div>
 ),
 },
 ], [t, tc, locale, router, warehouseMap]);

const activeSessionsCount = summaryData?.total ?? data?.meta?.total ?? 0;
   const inProgressCount = summaryData?.in_progress ?? 0;
   const postedCount = summaryData?.posted ?? 0;

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="flex flex-col gap-6">
 <Breadcrumb 
 items={[
 { label: tc('inventory'), href: '#' },
 { label: t('title'), href: `/stocktake` }
 ]} 
 />
 <PageHeader
 title={t('title')}
 description={t('description') || 'Physical inventory verification and variance auditing'} actions={
 <div className="flex items-center gap-8">
 <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-8 hidden md:flex">
 <div className="text-label-xs font-semibold uppercase text-cyan-500 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
 {tc('statuses.live_updates')}
 </div>
 <div dir="ltr" className="text-label-xxs font-bold text-muted-foreground/30 flex items-center gap-1.5">
 <History className="w-2.5 h-2.5" />
 <ClientOnlyTime locale={locale as 'ar' | 'en'} className="text-label-xxs font-bold text-muted-foreground/30 flex items-center gap-1.5" fallback={`${tc('statuses.last_sync')}: ...`} />
 </div>
 </div>
 <PermissionGate action="create" resource="stocktake">
 <Link href={`/stocktake/new`}>
 <Button className="h-12 px-10 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-md transition-all shadow-xl shadow-cyan-900/20 group">
 <Plus className="w-4 h-4 me-2 group-hover:rotate-90 transition-transform" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 </div>
 }
 />
 </div>

 <QueryBoundary 
        isLoading={isLoading} 
        error={data === undefined && !isLoading ? new Error('Failed to load data') : null}
        loadingFallback={<PageSkeleton />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            label={t('total_sessions')}
            value={activeSessionsCount}
            icon={FileText}
            trend="active"
          />
          <MetricCard
            label={t('in_progress')}
            value={inProgressCount}
            icon={AlertCircle}
            trend="active"
            color="amber"
          />
          <MetricCard
            label={t('posted')}
            value={postedCount}
            icon={ClipboardCheck}
            trend="active"
            color="emerald"
          />
        </div>

<div className="space-y-6">
           <div className="flex flex-wrap items-end gap-6 w-full p-8 bg-surface-container-low rounded-lg border border-outline-low shadow-2xl">
             <div className="flex flex-col gap-3 min-w-[280px] flex-1">
               <div className="flex items-center gap-2 ms-1">
                 <Filter className="w-3 h-3 text-cyan-500/60" />
                 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('status_label') || 'Filter by State'}</label>
               </div>
               <SmartCombobox
                 items={statusItems}
                 value={initialStatus || 'ALL'}
                 onSelect={(item) => handleStatusChange(item.id === 'ALL' ? '' : String(item.id))}
                 placeholder={tc('statuses.all') || "All Statuses"}
                 triggerClassName="w-full bg-surface-container-highest/20 border-outline-low h-12 px-5 text-label-sm font-semibold rounded-md focus:ring-cyan-500/20 hover:bg-surface-container-highest/40 transition-all"
               />
             </div>

             <div className="flex flex-col gap-3 min-w-[340px] flex-[2]">
               <div className="flex items-center gap-2 ms-1">
                 <Search className="w-3 h-3 text-cyan-500/60" />
                 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('search')}</label>
               </div>
               <div className="relative group">
                 <input
                   placeholder={t('search_placeholder') || 'Search by Session ID...'}
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full bg-surface-container-highest/20 border border-outline-low h-12 px-6 text-label-sm font-semibold rounded-md outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all placeholder:text-muted-foreground/20 group-hover:bg-surface-container-highest/40"
                 />
               </div>
             </div>

             <Button
               className="h-12 px-8 bg-surface-container-highest/40 hover:bg-surface-container-highest/60 text-foreground/60 text-label-xs font-semibold uppercase rounded-md transition-all border border-outline-low hover:text-foreground group"
               onClick={() => setShowFilters(!showFilters)}
             >
               <Filter className="w-3.5 h-3.5 me-2 transition-transform group-hover:rotate-180" />
               {tc('filters_button')}
               {activeFilterCount > 0 && (
                 <span className="ms-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-label-xxs font-bold">
                   {activeFilterCount}
                 </span>
               )}
             </Button>
             <Button
               variant="ghost"
               size="sm"
               className="h-12 px-4 text-muted-foreground/60 hover:text-foreground text-label-xs font-semibold uppercase rounded-md transition-all"
               onClick={() => { handleStatusChange(''); setDateFrom(''); setDateTo(''); }}
             >
               <RotateCcw className="w-3.5 h-3.5 me-2" />
               {tc('clear_filters') || 'Clear Filters'}
             </Button>
           </div>

           {showFilters && (
             <div className="flex items-center gap-6 px-8 py-4 bg-surface-container-low/30 border border-outline-low/5 rounded-lg">
               <div className="flex flex-col gap-2 min-w-[180px]">
                 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">{tFilters('date_from')}</label>
                 <input
                   type="date"
                   value={dateFrom}
                   onChange={(e) => { setDateFrom(e.target.value); handlePageChange(1); }}
                   className="bg-surface-container-highest/20 border border-outline-low/10 h-10 px-3 text-label-xs font-medium rounded-md text-foreground focus:ring-1 focus:ring-cyan-500/20 outline-none"
                   dir="ltr"
                 />
               </div>
               <div className="flex flex-col gap-2 min-w-[180px]">
                 <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1">{tFilters('date_to')}</label>
                 <input
                   type="date"
                   value={dateTo}
                   onChange={(e) => { setDateTo(e.target.value); handlePageChange(1); }}
                   className="bg-surface-container-highest/20 border border-outline-low/10 h-10 px-3 text-label-xs font-medium rounded-md text-foreground focus:ring-1 focus:ring-cyan-500/20 outline-none"
                   dir="ltr"
                 />
               </div>
             </div>
           )}

          <div className="bg-surface-container-lowest rounded-lg border border-outline-low overflow-hidden shadow-2xl">
            <DataTable
              columns={columns}
              data={data?.data || []}
              isLoading={false}
              onRowClick={(row: StocktakeSummary) => router.push(`/stocktake/${row.id}`)}
              collectionName="operations_stocktake"
              enableVirtualization={true}
              containerHeight="600px"
              sorting={sorting}
              onSortingChange={setSorting}
              emptyState={
                <EmptyState 
                  variant="minimal"
                  title={t('no_records') || 'No Stocktakes Found'} 
                  description={t('description') || 'Physical inventory verification sessions will appear here.'} 
                  action={
                    <PermissionGate action="create" resource="stocktake">
                      <Button 
                        onClick={() => router.push(`/stocktake/new`)}
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
                page: data.meta.page,
                pageSize: data.meta.page_size,
                total: data.meta.total,
                totalPages: data.meta.total_pages,
                onPageChange: handlePageChange
              } : undefined}
            />
          </div>
        </div>
      </QueryBoundary>
 </div>
 );
}
