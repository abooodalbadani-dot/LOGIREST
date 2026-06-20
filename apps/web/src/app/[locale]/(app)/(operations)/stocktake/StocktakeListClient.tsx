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
import { FileText, ClipboardCheck, AlertCircle, Plus, Filter, Search, Warehouse, Calendar, History, RotateCcw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  return new Map(list.map((w) => [w.id, w.name]));
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
   accessorKey: 'sessionNumber',
   header: t('session_number') || 'Session',
   meta: { sortBy: 'snapshot_at' },
   cell: ({ row }) => (
    <div className="flex flex-col min-w-0">
     <span dir="ltr" className="font-mono text-body-md font-semibold text-foreground group-hover:text-foreground transition-colors">
      {row.original.sessionNumber}
     </span>
     <span className="text-label-xxs font-semibold text-muted-foreground/40 uppercase">
      Operational Audit
     </span>
     <div className="flex items-center gap-1.5 opacity-20 mt-1">
      <Calendar className="w-2.5 h-2.5" />
      <ClientOnlyTime 
       date={row.original.snapshotAt} 
       mode="datetime" 
       locale={locale as 'ar' | 'en'}
       className="text-label-xxs font-semibold tabular-nums"
      />
     </div>
    </div>
   ),
  },
  {
   accessorKey: 'warehouseId',
   header: tc('warehouse') || 'Warehouse',
   cell: ({ row }) => {
    const display = warehouseMap.get(row.original.warehouseId) || '—';
    return (
     <div className="gap-2 min-w-0 items-center flex-1 gap-6 flex-col flex w-full">
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
    const total = row.original.totalItems || 0;
    const counted = row.original.countedItems || 0;
    const pct = total > 0 ? Math.round((counted / total) * 100) : 0;
    return (
     <div className="flex flex-col gap-1.5 min-w-[140px] min-w-0">
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
 className="text-xs font-bold tracking-wider text-muted-foreground hover:text-brand-gold uppercase transition-colors h-8 px-3 rounded-lg"
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
const inProgressCount = summaryData?.active ?? 0;
const postedCount = summaryData?.completed ?? 0;

 return (
 <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="flex flex-col gap-6 min-w-0">
 <Breadcrumb 
 items={[
 { label: tc('inventory'), href: '#' },
 { label: t('title'), href: `/stocktake` }
 ]} 
 />
 <PageHeader
 title={t('title')}
 subtitle={t('description') || 'Physical inventory verification and variance auditing'} children={
 <div className="flex items-center gap-8">
 <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-8 hidden md:flex min-w-0">
 <div className="text-label-xs font-semibold uppercase text-foreground flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
 {tc('statuses.live_updates')}
 </div>
 <div dir="ltr" className="text-label-xxs font-bold text-muted-foreground/30 flex items-center gap-1.5">
 <History className="w-2.5 h-2.5" />
 <ClientOnlyTime locale={locale as 'ar' | 'en'} className="text-label-xxs font-bold text-muted-foreground/30 flex items-center gap-1.5" fallback={`${tc('statuses.last_sync')}: ...`} />
 </div>
 </div>
 <PermissionGate action="create" resource="stocktake">
 <Link href={`/stocktake/new`} className="shrink-0 w-full sm:w-auto">
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

      <div className="flex-1 w-full min-h-[400px] md:min-h-0">
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
        filters={
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
           <div className="w-full sm:w-64">
             <div className="relative w-full">
               <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
               <Input
                 placeholder={t('search_placeholder') || 'Search by Session ID...'}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full h-11 ps-10 bg-background border border-border text-foreground focus:border-brand-gold rounded-xl transition-all shadow-sm"
               />
             </div>
           </div>
           <div className="w-full sm:w-48 relative group">
             <SmartCombobox
               items={statusItems}
               value={initialStatus || 'ALL'}
               onSelect={(item) => handleStatusChange(item.id === 'ALL' ? '' : String(item.id))}
               placeholder={tc('statuses.all') || "All Statuses"}
               triggerClassName={initialStatus && initialStatus !== 'ALL' ? "h-11 bg-background border border-border shadow-sm pr-8 w-full" : "h-11 bg-background border border-border shadow-sm w-full"}
             />
             {initialStatus && initialStatus !== 'ALL' && (
               <Button
                 variant="ghost"
                 size="icon"
                 className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
                 onClick={(e) => { e.stopPropagation(); handleStatusChange(''); }}
               >
                 <X className="h-4 w-4" />
               </Button>
             )}
           </div>
         </div>
        }
        emptyState={
         <EmptyState 
          variant="minimal"
          title={t('no_records') || 'No Stocktakes Found'} 
          description={t('description') || 'Physical inventory verification sessions will appear here.'} 
          action={
           <PermissionGate action="create" resource="stocktake">
            <Button 
             onClick={() => router.push(`/stocktake/new`)}
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
         page: data.meta.page,
         pageSize: data.meta.pageSize,
         total: data.meta.total,
         totalPages: data.meta.totalPages,
         onPageChange: handlePageChange
        } : undefined}
       />
      </div>
   </QueryBoundary>
 </div>
 );
}
