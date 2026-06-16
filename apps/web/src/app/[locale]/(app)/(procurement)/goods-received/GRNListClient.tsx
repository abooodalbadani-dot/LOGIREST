'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useGRNList, type GRNSummary } from '@/features/purchasing/hooks/useGRNList';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PageHeader } from '@/components/shared/PageHeader';
import { Plus, Filter, Search, CheckCircle2, Clock, Inbox, ArrowRight, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { Input } from '@/components/ui/input';
import { useDeleteGRN } from '@/features/purchasing/hooks/useDeleteGRN';

import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { isPendingStatus, isPostedStatus, type DocumentStatus } from '@logirest/shared-types';
import { GRN_STATUS } from '@logirest/shared-types';
import { QueryBoundary } from '@/core/query/QueryBoundary';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function GRNListClient({
 initialStatus,
 initialPage,
 locale,
 }: {
 initialStatus?: string;
 initialPage: number;
 locale: 'ar' | 'en';
}) {
 const t = useTranslations('procurement.grn');
 const tc = useTranslations('common');
 const router = useRouter();

 const deleteGRN = useDeleteGRN();
 const [status, setStatus] = useState<string | undefined>(initialStatus);
 const [page, setPage] = useState(initialPage);
 const [search, setSearch] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [sortField, setSortField] = useState<string>('');
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

 const statusItems = useMemo(() => [
  { id: 'ALL', name_en: tc('statuses.all'), name_ar: tc('statuses.all') },
  { id: GRN_STATUS.DRAFT, name_en: tc('statuses.draft'), name_ar: tc('statuses.draft') },
  { id: GRN_STATUS.POSTED, name_en: tc('statuses.posted'), name_ar: tc('statuses.posted') },
 ], [tc]);

 // Debounce search input
 useEffect(() => {
 const timer = setTimeout(() => setDebouncedSearch(search), 500);
 return () => clearTimeout(timer);
 }, [search]);

 const { data, isLoading } = useGRNList({ status, page, search: debouncedSearch, sortField, sortOrder });

 const toggleSort = (field: string) => {
  setSortField(prev => {
   const newOrder = prev === field && sortOrder === 'asc' ? 'desc' : 'asc';
   setSortOrder(newOrder);
   return field;
  });
  setPage(1);
 };

 const SortHeader = ({ field, label }: { field: string; label: string }) => (
  <button
   onClick={() => toggleSort(field)}
   className="flex items-center gap-1.5 text-label-xs font-semibold uppercase text-muted-foreground/60 hover:text-foreground transition-colors"
  >
   {label}
   {sortField === field ? (
    sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
   ) : (
    <ArrowUp className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
   )}
  </button>
 );

 const columns = useMemo<ColumnDef<GRNSummary, unknown>[]>(() => [
 {
 accessorKey: 'status',
 header: tc('status_label'),
 cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
 },
 {
 accessorKey: 'documentNumber',
 header: tc('doc_number'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5 min-w-0">
 <span dir="ltr" className="font-mono text-cyan-500 font-semibold text-body-md">{row.original.documentNumber}</span>
 <span className="text-label-xxs font-semibold uppercase opacity-30">{t('received_manifest_sub')}</span>
 </div>
 ),
 },
  {
   accessorKey: 'supplierName',
   header: () => <SortHeader field="supplierName" label={tc('supplier')} />,
   cell: ({ row }) => (
    <div className="flex flex-col min-w-0">
     <span className="text-label-xs font-semibold text-foreground/80 text-start">
      {row.original.supplierName || row.original.supplierId}
     </span>
     <span className="text-label-xxs font-medium opacity-40 uppercase">{t('verified_vendor_sub')}</span>
    </div>
   ),
  },
  {
   accessorKey: 'warehouseName',
   header: tc('warehouse'),
   cell: ({ row }) => (
    <div className="flex flex-col min-w-0">
     <span className="text-label-xs font-semibold text-foreground/80 text-start">
      {row.original.warehouseName || row.original.warehouseId || '-'}
     </span>
     <span className="text-label-xxs font-medium opacity-40 uppercase">{tc('warehouse')}</span>
    </div>
   ),
  },
  {
   accessorKey: 'postedAt',
   header: () => <SortHeader field="postedAt" label={tc('posted_at')} />,
   cell: ({ row }) =>
    row.original.postedAt ? (
     <div className="flex items-center gap-2">
      <ClientOnlyTime 
       date={row.original.postedAt} 
       mode="date" 
       className="text-label-xs opacity-60 font-mono font-medium" 
      />
     </div>
    ) : <span className="opacity-10 text-label-xs font-semibold italic">{t('pending_label')}</span>,
  },
 {
  id: 'actions',
  header: '',
  cell: ({ row }) => {
   const isDraft = row.original.status === GRN_STATUS.DRAFT;
   return (
    <div className="gap-2 min-w-0 items-center flex-1 gap-6 justify-end flex-col flex w-full">
     <PermissionGate action="view" resource="grn">
      <Button
       variant="ghost"
       size="sm"
       className="text-label-xxs font-semibold uppercase text-cyan-500 hover:text-white hover:bg-cyan-500/20 h-8 px-4 rounded-md transition-all group"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/goods-received/${row.original.id}`);
       }}
      >
       {tc('view')}
       <ArrowRight className="w-3 h-3 ms-2 opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0 rtl:translate-x-[4px] rtl:group-hover:translate-x-0 rtl:rotate-180" />
      </Button>
     </PermissionGate>

     {isDraft && (
      <PermissionGate action="delete" resource="grn">
       <Button
        variant="ghost"
        size="icon"
        disabled={deleteGRN.isPending}
        className="w-8 h-8 rounded-md bg-red-500/5 hover:bg-red-500/20 text-red-500 transition-all"
        onClick={async (e) => {
         e.stopPropagation();
         const confirmed = window.confirm('Are you sure you want to delete this draft goods received note?');
         if (!confirmed) return;
         try {
          await deleteGRN.mutateAsync({ id: row.original.id });
         } catch (err) {
          console.error(err);
         }
        }}
       >
        <Trash2 className="w-4 h-4" />
       </Button>
      </PermissionGate>
     )}
    </div>
   );
  },
 },
  ], [locale, router, t, tc, sortField, sortOrder, deleteGRN.isPending, deleteGRN]);

 const totalGRNs = data?.meta?.total || 0;
 const postedCount = data?.data?.filter(p => isPostedStatus('GRN', p.status as DocumentStatus)).length || 0;
 const draftCount = data?.data?.filter(p => isPendingStatus('GRN', p.status as DocumentStatus)).length || 0;

 return (
 <div className="p-10 max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
 <div className="space-y-4">
 <Breadcrumb 
 items={[
  { label: tc('sidebar.dashboard'), href: '/dashboard' },
 { label: tc('sidebar.grn') }
 ]} 
 />
 <PageHeader
 title={t('title')}
 description={t('description')}
 actions={
 <div className="flex items-center gap-6">
 <PermissionGate action="create" resource="grn">
  <Link href="/goods-received/new">
 <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-md transition-all shadow-sm shadow-cyan-900/10 border-none">
 <Plus className="w-3.5 h-3.5 me-2" />
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
     <MetricCard
      label={t('stats.total_manifests')}
      value={totalGRNs}
      icon={Inbox}
      color="cyan"
     />
     <MetricCard
      label={t('stats.committed_batches')}
      value={postedCount}
      icon={CheckCircle2}
      color="emerald"
     />
     <MetricCard
      label={t('stats.awaiting_audit')}
      value={draftCount}
      icon={Clock}
      color="amber"
     />
    </div>

    <div className="bg-card border border-border shadow-sm border border-surface-variant/5 rounded-lg p-1">
     <DataTable
      columns={columns}
      data={data?.data || []}
      onRowClick={(row: GRNSummary) => router.push(`/goods-received/${row.id}`)}
      collectionName="procurement_grn"
      enableVirtualization={true}
      containerHeight="600px"
      emptyState={
       <EmptyState 
        variant="minimal"
        title={t('no_grns_title') || 'No Goods Received Notes'} 
        description={t('no_grns_desc') || 'Create a new GRN when goods are delivered to update stock levels.'} 
        action={
         <PermissionGate action="create" resource="grn">
          <Link href="/goods-received/new">
           <Button className="h-10 px-6 bg-cyan-500 hover:bg-cyan-400 text-black text-label-xs font-semibold uppercase rounded-md transition-all">
            <Plus className="w-3.5 h-3.5 me-2" />
            {t('create_new')}
           </Button>
          </Link>
         </PermissionGate>
        }
       />
      }
      pagination={data?.meta ? {
       page: data.meta.page,
       pageSize: data.meta.pageSize,
       total: data.meta.total,
       totalPages: data.meta.totalPages,
       onPageChange: setPage
      } : undefined}
      filters={
      <div className="relative w-full sm:max-w-md flex-1 shrink-0 min-w-[250px]">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
         placeholder={tc('statuses.all')}
         value={status || 'ALL'}
         onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full ps-10 pe-4 bg-background border-border text-foreground focus:ring-operational-cyan focus:border-operational-cyan shadow-sm transition-all rounded-lg"
        />
       </div>
     }
     />
    </div>
   </QueryBoundary>
 </div>
 );
}
