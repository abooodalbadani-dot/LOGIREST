'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { useGRNList, type GRNSummary } from '@/features/purchasing/hooks/useGRNList';
import { useSuppliers } from '@/features/purchasing/hooks/useSuppliers';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PageHeader } from '@/components/shared/PageHeader';
import { Plus, Filter, Search, CheckCircle2, Clock, Inbox, ArrowRight, ArrowUp, ArrowDown, Trash2, ArrowUpRight, Package, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeleteGRN } from '@/features/purchasing/hooks/useDeleteGRN';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { isPendingStatus, isPostedStatus, type DocumentStatus } from '@logirest/shared-types';
import { GRN_STATUS } from '@logirest/shared-types';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { QueryBoundary } from '@/core/query/QueryBoundary';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

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
 const { data: suppliers } = useSuppliers();
 const supplierMap = useMemo(() => new Map(suppliers?.map(s => [s.id, s.name]) || []), [suppliers]);

 const resolveSupplierName = useMemo(() => (grn: GRNSummary) => {
   if (grn.supplierName && grn.supplierName.trim() !== '') return grn.supplierName;
   if (grn.supplier?.name && grn.supplier.name.trim() !== '') return grn.supplier.name;
   if (grn.purchaseOrder?.supplier?.name && grn.purchaseOrder.supplier.name.trim() !== '') return grn.purchaseOrder.supplier.name;
   if (grn.supplierId && supplierMap.has(grn.supplierId)) return supplierMap.get(grn.supplierId)!;
   return '—';
 }, [supplierMap]);

 const [status, setStatus] = useState<string | undefined>(initialStatus);
 const [page, setPage] = useState(initialPage);
 const [search, setSearch] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [sortField, setSortField] = useState<string>('');
 const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

 const statusItems = useMemo(() => [
  { id: 'ALL', name_en: tc('statuses.all'), name_ar: tc('statuses.all') },
  { id: GRN_STATUS.DRAFT, name_en: tc('statuses.draft'), name_ar: tc('statuses.draft') },
  { id: GRN_STATUS.RECEIVED, name_en: tc('statuses.received'), name_ar: tc('statuses.received') },
  { id: GRN_STATUS.POSTED, name_en: tc('statuses.posted'), name_ar: tc('statuses.posted') },
  { id: GRN_STATUS.CANCELLED, name_en: tc('statuses.cancelled'), name_ar: tc('statuses.cancelled') },
  { id: GRN_STATUS.VOIDED, name_en: tc('statuses.voided'), name_ar: tc('statuses.voided') },
 ], [tc]);

 useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 500);
  return () => clearTimeout(timer);
 }, [search]);

 const activeStatusQuery = status === 'ALL' || !status ? undefined : status;
 const { data, isLoading } = useGRNList({ status: activeStatusQuery, page, search: debouncedSearch, sortField, sortOrder });

 const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000');
      if (activeStatusQuery) params.set('status', activeStatusQuery);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await apiClient.get(`/procurement/grns?${params.toString()}`, paginatedSchema(z.object({
        documentNumber: z.string(),
        status: z.string(),
        supplierName: z.string().optional().nullable(),
        warehouseName: z.string().optional().nullable(),
        createdAt: z.string().optional().nullable(),
      })));

      const mapGRNRows = (rows: unknown[]) => rows.map(g => {
        const itemObj = g as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          documentNumber: itemObj.documentNumber || '—',
          supplierName: itemObj.supplierName || '—',
          warehouseName: itemObj.warehouseName || '—',
          status: itemObj.status || itemObj.grnStatus || '—',
          grnStatus: itemObj.status || itemObj.grnStatus || '—',
          createdAt: dateStr,
        };
      });

      return mapGRNRows((res?.data ?? data?.data ?? []) as unknown[]);
    } catch {
      return ((data?.data ?? []) as unknown[]).map(g => {
        const itemObj = g as Record<string, unknown>;
        let dateStr = '—';
        try {
          if (itemObj.createdAt) dateStr = format(new Date(String(itemObj.createdAt)), 'yyyy-MM-dd HH:mm');
        } catch {
          dateStr = String(itemObj.createdAt || '—');
        }

        return {
          documentNumber: itemObj.documentNumber || '—',
          supplierName: itemObj.supplierName || '—',
          warehouseName: itemObj.warehouseName || '—',
          status: itemObj.status || itemObj.grnStatus || '—',
          grnStatus: itemObj.status || itemObj.grnStatus || '—',
          createdAt: dateStr,
        };
      });
    }
  };

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
     <span dir="ltr" className="font-mono text-foreground font-semibold text-body-md">{row.original.documentNumber}</span>
     <span className="text-label-xxs font-semibold uppercase opacity-30">{t('received_manifest_sub')}</span>
    </div>
   ),
  },
  {
   accessorKey: 'supplierName',
   header: () => <SortHeader field="supplierName" label={tc('supplier')} />,
   cell: ({ row }) => {
    const supplierName = resolveSupplierName(row.original);
    return (
     <div className="flex flex-col min-w-0">
      <span className="text-label-xs font-semibold text-foreground/80 text-start">
       {supplierName}
      </span>
      <span className="text-label-xxs font-medium opacity-40 uppercase">{t('verified_vendor_sub')}</span>
     </div>
    );
   },
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
     <div className="flex items-center gap-2 justify-end">
      <PermissionGate action="view" resource="grn">
       <Button
        variant="ghost"
        size="sm"
        className="text-xs font-bold tracking-wider text-muted-foreground hover:text-brand-gold uppercase transition-colors h-8 px-3 rounded-lg"
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
  <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
   <div className="space-y-4">
    <Breadcrumb 
     items={[
      { label: tc('sidebar.dashboard'), href: '/dashboard' },
      { label: tc('sidebar.grn') }
     ]} 
    />
    <PageHeader
     title={t('title')}
     subtitle={t('description')}
     children={
      <div className="flex items-center gap-6">
       <PermissionGate action="create" resource="grn">
        <Link href="/goods-received/new" className="shrink-0 w-full sm:w-auto">
         <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-8">
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

    <div className="flex w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
     <Tabs value={status || 'ALL'} onValueChange={(val) => { setStatus(val); setPage(1); }} className="w-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto overflow-y-hidden hide-scrollbar border-b border-border/10 pb-0 gap-6">
       {statusItems.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id} className="pb-3 text-label-xs font-bold uppercase tracking-wider h-auto">
         {locale === 'ar' ? tab.name_ar : tab.name_en}
        </TabsTrigger>
       ))}
      </TabsList>
     </Tabs>
    </div>

    <div className="flex-1 w-full min-h-[400px] md:min-h-0">
     {/* Unified Search Toolbar */}
     <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-6">
      <div className="relative w-full sm:w-64">
       <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
       <Input
        placeholder={tc('search')}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full h-11 ps-10 bg-background border border-border text-foreground focus:border-brand-gold rounded-xl transition-all shadow-sm"
       />
      </div>

      {data?.data && data.data.length > 0 && (
       <PermissionGate action="export" resource="grn">
        <div className="flex items-center gap-2 shrink-0">
         <ExportMenu
          data={data.data as unknown as Record<string, unknown>[]}
          columns={[
           { header: t('doc_number') || 'Doc #', key: 'documentNumber' },
           { header: t('supplier') || 'Supplier', key: 'supplierName' },
           { header: tc('warehouse') || 'Warehouse', key: 'warehouseName' },
           { header: tc('status_label') || 'Status', key: 'grnStatus' },
           { header: tc('created_at') || 'Date', key: 'createdAt' },
          ]}
          filename="goods_received"
          title={t('title')}
          onExportAll={handleExportAll}
         />
        </div>
       </PermissionGate>
      )}
     </div>

     <div className="hidden md:block w-full">
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
           <Link href="/goods-received/new" className="shrink-0 w-full sm:w-auto">
            <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
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
      />
     </div>

     {(!isLoading && data?.data && data.data.length > 0) && (
      <VirtualizedMobileGrid
       data={data.data}
       estimateSize={150}
       maxHeight={600}
       className="mt-4 p-4"
       renderCard={(grn) => {
        const isDraft = grn.status === GRN_STATUS.DRAFT;
        return (
         <div 
          key={grn.id} 
          className="bg-surface-lowest dark:bg-card rounded-xl p-3 flex flex-col gap-3 shadow-sm border border-border group hover:border-brand-gold/30 transition-colors cursor-pointer"
          onClick={() => router.push(`/goods-received/${grn.id}`)}
         >
          <div className="flex justify-between items-start w-full">
           <div className="flex flex-col gap-1.5 w-full min-w-0 pr-2">
            <div className="flex items-center justify-between w-full">
             <span className="text-[11px] font-mono font-extrabold text-foreground bg-surface-container-highest px-2 py-0.5 rounded-md border border-border/50 uppercase truncate">{grn.documentNumber}</span>
             <StatusBadge status={grn.status as BadgeStatus} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
            </div>
            <span className="text-sm font-bold text-foreground line-clamp-1 flex items-center gap-1.5 mt-0.5">
             <Inbox className="w-4 h-4 text-brand-gold shrink-0" />
             {resolveSupplierName(grn)}
            </span>
           </div>
          </div>

          <div className="flex items-center justify-between mt-1 pt-3 border-t border-border/40">
           <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5">
             <div className="w-7 h-7 rounded-md bg-surface-container-highest flex items-center justify-center shrink-0 border border-border/50">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
             </div>
             <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{tc('warehouse')}</span>
              <span className="text-[11px] font-bold text-foreground truncate max-w-[120px]">
               {grn.warehouseName || grn.warehouseId || '-'}
              </span>
             </div>
            </div>
           </div>
           
           <div className="flex gap-1.5 shrink-0 items-center">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-surface-container px-2 py-1.5 rounded-md border border-border/50 me-1">
             <Calendar className="w-3.5 h-3.5 text-brand-gold" />
             {grn.postedAt ? (
              <ClientOnlyTime 
               date={grn.postedAt} 
               mode="date" 
               className="font-mono font-bold" 
              />
             ) : <span className="opacity-50 italic">{t('pending_label')}</span>}
            </div>

            <PermissionGate action="view" resource="grn">
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-brand-gold bg-brand-gold/5 border border-brand-gold/10 hover:bg-brand-gold/15 hover:text-brand-gold transition-colors shrink-0"
              onClick={(e) => {
               e.stopPropagation();
               router.push(`/goods-received/${grn.id}`);
              }}
             >
              <ArrowUpRight className="w-4 h-4 rtl:rotate-[-90deg]" />
             </Button>
            </PermissionGate>
            {isDraft && (
             <PermissionGate action="delete" resource="grn">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-status-error bg-status-error/5 border border-status-error/10 hover:bg-status-error/15 hover:text-status-error transition-colors shrink-0"
               onClick={async (e) => {
                e.stopPropagation();
                const confirmed = window.confirm('Are you sure you want to delete this draft goods received note?');
                if (!confirmed) return;
                try {
                 await deleteGRN.mutateAsync({ id: grn.id });
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
          </div>
         </div>
        );
       }}
      />
     )}
    </div>
   </QueryBoundary>
  </div>
 );
}
