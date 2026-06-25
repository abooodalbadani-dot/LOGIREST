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
import { Plus, Filter, Repeat, Truck, CheckCircle, AlertTriangle, Search, X, ArrowLeft } from 'lucide-react';
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
  return new Map(list.map((w) => [w.id, w.name || '']));
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

 const { data, isLoading } = useTransferList({ status, page, search: debouncedSearch, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, sortBy, sortDir });
 const { data: summaryData } = useTransferSummary();
 useOperationalScope();

 const columns = useMemo<ColumnDef<TransferSummary>[]>(() => [
  {
   accessorKey: 'transferStatus',
   header: tCommon('status_label'),
   meta: { sortBy: 'status' },
   cell: ({ row }) => <StatusBadge status={row.original.transferStatus} />,
  },
  {
   accessorKey: 'documentNumber',
   header: tCommon('doc_number'),
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono text-foreground/90 font-semibold text-body-md">
     {row.original.documentNumber}
    </span>
   ),
  },
  {
   accessorKey: 'fromWarehouseId',
   header: t('from_warehouse'),
   cell: ({ row }) => {
    const name = warehouseMap.get(row.original.fromWarehouseId);
    const display = name || row.original.fromWarehouseName || '—';
    return (
     <span className="opacity-80 font-medium">
      {display}
     </span>
    );
   },
  },
  {
   accessorKey: 'toWarehouseId',
   header: t('to_warehouse'),
   cell: ({ row }) => {
    const name = warehouseMap.get(row.original.toWarehouseId);
    const display = name || row.original.toWarehouseName || '—';
    return (
     <span className="opacity-80 font-medium">
      {display}
     </span>
    );
   },
  },
  {
   accessorKey: 'shippedAt',
   header: t('shipped_at'),
   meta: { sortBy: 'shipped_at' },
   cell: ({ row }) => (
    <ClientOnlyTime
     date={row.original.shippedAt}
     mode="date"
     locale={locale}
     className="text-label-xs opacity-60 font-mono font-medium"
    />
   ),
  },
  {
   accessorKey: 'createdAt',
   header: tCommon('created_at'),
   meta: { sortBy: 'created_at' },
   cell: ({ row }) => (
    <ClientOnlyTime
     date={row.original.createdAt}
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
      className="text-[#b48e67] hover:text-[#8a6b4c] hover:bg-transparent text-xs font-bold flex items-center gap-1 transition-colors h-7 px-2"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/transfers/${row.original.id}`);
      }}
     >
      {tCommon('view')}
      <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
     </Button>
    </div>
   ),
  },
 ], [t, tCommon, router, warehouseMap, locale]);

 const totalTransfersCount = summaryData?.total ?? data?.meta?.total ?? 0;
 const inTransitCount = summaryData?.inTransit ?? 0;
 const completedCount = data?.data?.filter(i => i.transferStatus === 'RECEIVED' || i.transferStatus === 'POSTED' || i.transferStatus === 'COMPLETED').length ?? 0;

 const overdueCount = summaryData?.overdueCount ?? 0;

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex space-y-10 w-full">
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
    subtitle={t('description')}
    children={
     <div className="flex items-center gap-6">
      <div className="flex flex-col items-end gap-1 border-e border-outline-low pe-6 hidden md:flex min-w-0">
       <div className="text-label-xs font-semibold uppercase text-muted-foreground/60 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
        {tCommon('statuses.live_updates')}
       </div>
       <div className="text-label-xxs font-semibold text-muted-foreground/40 whitespace-nowrap" dir="ltr">
        {tCommon('statuses.last_sync')}: <ClientOnlyTime locale={locale} fallback="..." />
       </div>
      </div>
      <PermissionGate action="create" resource="transfer">
       <Link href="/transfers/new" className="shrink-0 w-full sm:w-auto">
        <Button className="px-4 py-2 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg shadow-sm hover:opacity-90 flex items-center gap-2 transition-opacity">
         <Plus className="w-4 h-4" />
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

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block h-full">
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
       totalPages: data.meta.totalPages,
       onPageChange: setPage
      } : undefined}
       filters={
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
           <div className="w-full sm:w-64">
             <div className="relative w-full">
               <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
               <Input
                 placeholder={tCommon('search') || "Search..."}
                 value={search}
                 onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                 className="w-full h-11 ps-10 bg-background border border-border text-foreground focus:border-brand-gold rounded-xl transition-all shadow-sm"
               />
             </div>
           </div>
           <div className="w-full sm:w-48 relative group">
             <SmartCombobox
               items={statusItems}
               value={status || 'ALL'}
               onSelect={(item) => { setStatus(item.id === 'ALL' ? '' : String(item.id)); setPage(1); }}
               placeholder={tCommon('statuses.all') || "All Statuses"}
               triggerClassName={status ? "h-11 bg-background border border-border shadow-sm pr-8 w-full" : "h-11 bg-background border border-border shadow-sm w-full"}
             />
             {status && (
               <Button
                 variant="ghost"
                 size="icon"
                 className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
                 onClick={(e) => { e.stopPropagation(); setStatus(''); setPage(1); }}
               >
                 <X className="h-4 w-4" />
               </Button>
             )}
           </div>
         </div>
       }
     />
    </div>
    <div className="flex flex-col gap-3 md:hidden mt-4 pb-10">
     {isLoading ? (
       <div className="flex items-center justify-center p-8"><span className="text-muted-foreground text-sm font-semibold animate-pulse">{tCommon('loading')}...</span></div>
     ) : (!data?.data || data.data.length === 0) ? (
       <EmptyState variant="minimal" title={tCommon('datatable.no_records')} />
     ) : (
       data.data.map((item) => (
         <div key={item.id} className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
           <div><StatusBadge status={item.transferStatus} /></div>
           <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
             <ClientOnlyTime date={item.createdAt} mode="date" locale={locale} />
           </span>
          </div>
          <div className="flex justify-between items-center">
           <span className="text-sm font-black text-[#0B1220] dark:text-white" dir="ltr">{item.documentNumber}</span>
           <button onClick={() => router.push(`/transfers/${item.id}`)} className="text-[#b48e67] hover:text-[#8a6b4c] text-xs font-bold flex items-center gap-1 transition-colors">
            {tCommon('view')} <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
           </button>
          </div>
          <div className="bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex flex-col gap-1.5 mt-1">
           <div className="flex justify-between items-center text-xs">
            <span className="text-[9px] text-gray-400 font-bold uppercase">{t('from_warehouse')}</span>
            <span className="font-bold text-gray-700 dark:text-gray-300">{warehouseMap.get(item.fromWarehouseId) || item.fromWarehouseName || '—'}</span>
           </div>
           <div className="flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800 pt-1.5">
            <span className="text-[9px] text-gray-400 font-bold uppercase">{t('to_warehouse')}</span>
            <span className="font-bold text-gray-700 dark:text-gray-300">{warehouseMap.get(item.toWarehouseId) || item.toWarehouseName || '—'}</span>
           </div>
          </div>
         </div>
       ))
     )}
    </div>
   </div>
  </div>
 );
}
