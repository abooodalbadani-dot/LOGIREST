'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { useTranslations } from 'next-intl';
import { Plus, Package, CheckCircle2, Search, Barcode, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useItems } from '@/features/items/hooks/useItems';
import { useDebounce } from '@/hooks/useDebounce';
import { type Item } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

export function ItemListClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const ti = useTranslations('master_data.items');
 const router = useRouter();
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);
 const debouncedSearch = useDebounce(search, 300);

 const { data, isLoading, isError, refetch } = useItems({ search: debouncedSearch || undefined, page });

 const handleExportAll = async (): Promise<Record<string, unknown>[]> => {
  try {
   const params = new URLSearchParams();
   params.set('page', '1');
   params.set('limit', '10000');
   if (debouncedSearch) params.set('search', debouncedSearch);

   const res = await apiClient.get(`/master-data/items?${params.toString()}`, paginatedSchema(z.object({
    code: z.string(),
    name: z.string(),
    barcode: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
   })));
   return (res?.data ?? data?.data ?? []).map(item => ({
    code: item.code,
    name: item.name,
    barcode: item.barcode ?? '',
    isActive: item.isActive ? 'Active' : 'Inactive',
   }));
  } catch {
   return (data?.data ?? []).map(item => ({
    code: item.code,
    name: item.name,
    barcode: item.barcode ?? '',
    isActive: item.isActive ? 'Active' : 'Inactive',
   }));
  }
 };

 const itemExportColumns = useMemo(() => [
  { header: 'Code', key: 'code' },
  { header: 'Name', key: 'name' },
  { header: 'Barcode', key: 'barcode' },
  { header: 'Status', key: 'isActive' },
 ], []);

 const stats = useMemo(() => {
  const items = data?.data ?? [];
  return {
   total: data?.meta?.total ?? 0,
   active: items.filter(i => i.isActive).length,
   trackingLots: items.filter(i => i.trackLots).length,
  };
 }, [data]);

 const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
  { 
   accessorKey: 'code', 
   header: t('code'), 
   cell: ({ row }) => (
    <div className="flex items-center min-w-0">
     <span className="font-mono text-operational-cyan font-bold uppercase text-label-xs bg-operational-cyan/10 px-2 py-0.5 rounded-lg border border-operational-cyan/5 w-fit whitespace-nowrap inline-block min-w-max" dir="ltr">{row.original.code}</span>
    </div>
   )
  },
  { 
   accessorKey: 'name', 
   header: t('name'), 
   cell: ({ row }) => {
    const item = row.original;
    const primaryBarcode = item.barcode || '—';
    const additionalBarcodes = Array.isArray(item.barcodeMappings)
     ? item.barcodeMappings
        .map((mapping) => mapping.barcode)
        .filter((b): b is string => Boolean(b) && b !== primaryBarcode)
     : [];
    const allBarcodes = Array.from(new Set([primaryBarcode, ...additionalBarcodes].filter((b) => b !== '—')));
    const extraBarcodesCount = additionalBarcodes.length;
    const hasMoreBarcodes = extraBarcodesCount > 0;
    const allBarcodesString = allBarcodes.length > 0 ? allBarcodes.join(', ') : 'No barcodes assigned';

    return (
     <div className="flex items-center gap-3">
      {item.image || item.imageUrl ? (
       <img src={item.image ?? item.imageUrl ?? ''} alt={item.name} className="w-8 h-8 object-cover rounded-md border border-border shrink-0" />
      ) : (
       <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded-md border border-border text-[9px] text-muted-foreground font-mono shrink-0">
        N/A
       </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
       <span className="font-bold text-label-sm text-foreground truncate max-w-[240px]" title={item.name}>{item.name}</span>
       <div className="flex items-center gap-1 text-muted-foreground text-xs" title={allBarcodesString}>
        <Barcode className="w-3 h-3 shrink-0 opacity-70" />
        <span className="font-mono truncate max-w-[120px]">{primaryBarcode}</span>
        {hasMoreBarcodes && <span className="font-bold font-mono text-operational-cyan ms-0.5">+{extraBarcodesCount}</span>}
       </div>
      </div>
     </div>
    );
   }
  },
  { 
   accessorKey: 'base_unit', 
   header: ti('fields.base_unit'), 
   cell: ({ row }) => {
    const item = row.original;
    const baseUnit = item.primaryUom?.code ?? item.primaryUom?.name ?? '—';
    const extraUnitsCount = Array.isArray(item.uomConversions) ? item.uomConversions.length : 0;
    const hasMoreUnits = extraUnitsCount > 0;

    return (
     <div className="flex items-center gap-2">
      <span className="text-label-xs font-bold uppercase text-muted-foreground px-2 py-0.5 bg-surface-container rounded-lg">
       {baseUnit}
      </span>
      {hasMoreUnits && (
       <Badge variant="secondary" className="text-[10px] font-bold h-5 px-1.5 shrink-0">
        + {extraUnitsCount}
       </Badge>
      )}
     </div>
    );
   }
  },
  {
   accessorKey: 'trackLots', 
   header: ti('fields.track_lots'),
   cell: ({ row }) => row.original.trackLots
    ? <div className="flex items-center gap-1.5 text-operational-cyan font-bold text-label-xxs uppercase bg-operational-cyan/10 px-2.5 py-1 rounded-lg border border-operational-cyan/5 w-fit">
      <div className="w-1.5 h-1.5 rounded-full bg-operational-cyan shadow-[0_0_8px_currentColor]" />
      {t('yes')}
     </div>
    : <div className="flex items-center gap-1.5 text-muted-foreground/40 font-bold text-label-xxs uppercase bg-surface-container px-2.5 py-1 rounded-lg w-fit">
      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
      {t('no')}
     </div>,
  },
  {
   accessorKey: 'isActive', 
   header: t('status'),
   cell: ({ row }) => (
    <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5" />
   ),
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-3">
     <PermissionGate action="view" resource="master_data_items">
      <Button 
       variant="ghost" 
       size="sm" 
       className="px-6 py-2.5 bg-foreground text-background font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/items/${row.original.id}`);
       }}
      >
       {t('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data_items">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/items/${row.original.id}/edit`);
       }}
      >
       {t('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [t, ti, locale, router]);

 if (isLoading && !data) {
  return <PageSkeleton variant="list" />;
 }

 if (isError) {
  return (
   <div className="min-w-0 gap-6 flex-1 flex-col flex w-full">
    <ErrorState 
     type="server_error"
     onRetry={() => refetch()}
    />
   </div>
  );
 }

 const breadcrumbs = [
  { label: t('home'), href: `/dashboard` },
  { label: t('master_data'), href: `/master-data` },
  { label: ti('title'), href: `/master-data/items` }
 ];

 return (
  <div className="w-full flex flex-col gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-200 min-w-0">
   <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
    <div className="flex flex-col gap-1 min-w-0">
     <Breadcrumb items={breadcrumbs} />
     <PageHeader 
      title={ti('title')} 
      subtitle={ti('description')}
      className="pb-0"
     />
    </div>
    <div className="shrink-0 mt-4 sm:mt-0">
     <PermissionGate action="create" resource="master_data_items">
      <Link href={`/master-data/items/new`} className="shrink-0 w-full sm:w-auto">
       <Button className="px-6 py-2.5 bg-foreground text-background font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <Plus className="w-3.5 h-3.5 me-2" />
        {t('create_new')}
       </Button>
      </Link>
     </PermissionGate>
    </div>
   </div>

   <div className="w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
    <MetricCard
     label={ti('metrics.total_items')}
     value={stats.total}
     icon={Package}
     color="cyan"
    />
    <MetricCard
     label={t('active')}
     value={stats.active}
     icon={CheckCircle2}
     color="emerald"
    />
    <MetricCard
     label={ti('metrics.tracking_lots')}
     value={stats.trackingLots}
     icon={ShieldAlert}
     color="amber"
    />
   </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    {/* Responsive Search & Export Toolbar */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-6">
     <div className="relative w-full sm:w-80 md:w-96 group">
      <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
      <Input
       placeholder={ti('search_placeholder')}
       value={search}
       onChange={(e) => { setSearch(e.target.value); setPage(1); }}
       className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
      />
     </div>

     {data?.data && data.data.length > 0 && (
      <PermissionGate action="export" resource="master_data_items">
       <div className="flex items-center gap-2 shrink-0">
        <ExportMenu
         data={data.data as unknown as Record<string, unknown>[]}
         columns={itemExportColumns}
         filename="master_data_items"
         title={ti('title')}
         onExportAll={handleExportAll}
        />
       </div>
      </PermissionGate>
     )}
    </div>

    <div className="hidden md:block w-full">
     <DataTable 
      columns={columns} 
      data={data?.data ?? []} 
      isLoading={isLoading}
      enableVirtualization={true}
      collectionName="master_data_items"
      emptyState={
       <EmptyState 
        variant="minimal"
        title={t('no_data')}
       />
      }
      onRowClick={(r: Item) => router.push(`/master-data/items/${r.id}`)}
      pagination={data?.meta ? {
       page: data.meta.page,
       pageSize: data.meta.pageSize,
       total: data.meta.total,
       totalPages: data.meta.totalPages,
       onPageChange: (p) => { setPage(p); },
      } : undefined}
     />
    </div>
    {!isLoading && data?.data && data.data.length > 0 && (
     <VirtualizedMobileItemList
      items={data.data}
      onView={(id) => router.push(`/master-data/items/${id}`)}
      onEdit={(id) => router.push(`/master-data/items/${id}/edit`)}
      tYes={t('yes')}
      tNo={t('no')}
      tView={t('view')}
      tEdit={t('edit')}
     />
    )}
   </div>
  </div>
 );
}

interface VirtualizedMobileItemListProps {
 items: Item[];
 onView: (id: string) => void;
 onEdit: (id: string) => void;
 tYes: string;
 tNo: string;
 tView: string;
 tEdit: string;
}

function VirtualizedMobileItemList({ items, onView, onEdit, tYes, tNo, tView, tEdit }: VirtualizedMobileItemListProps) {
 return (
  <VirtualizedMobileGrid
   data={items}
   estimateSize={130}
   maxHeight={600}
   className="mt-4"
   renderCard={(item) => (
    <div
     className="bg-surface-lowest dark:bg-surface-container rounded-xl p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-surface-low dark:hover:bg-surface-container-high transition-colors"
     onClick={() => onView(item.id)}
    >
     <div className="flex gap-3 items-start">
      {item.image ? (
       <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded-md border-0 shrink-0" />
      ) : (
       <div className="w-10 h-10 bg-surface-container flex items-center justify-center rounded-md border-0 text-[10px] text-muted-foreground font-mono shrink-0">
        N/A
       </div>
      )}
      <div className="flex flex-col gap-1 w-full min-w-0">
       <div className="flex justify-between items-start gap-2">
        <span className="text-sm font-bold text-foreground line-clamp-1">{item.name}</span>
        <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
       </div>
       <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[11px] font-mono font-bold text-operational-cyan uppercase">{item.code}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{item.barcode || '—'}</span>
       </div>
      </div>
     </div>
     <div className="flex justify-between items-center pt-2 mt-1 border-t border-border/20">
      <div className="flex gap-1.5 flex-wrap">
       <span className="text-[10px] font-medium text-muted-foreground bg-surface-container px-2 py-0.5 rounded uppercase">{item.primaryUom?.code}</span>
       {item.trackLots ? (
        <span className="text-[10px] font-bold text-operational-cyan bg-operational-cyan/10 px-2 py-0.5 rounded whitespace-nowrap">{tYes}</span>
       ) : (
        <span className="text-[10px] font-medium text-muted-foreground/60 bg-surface-container px-2 py-0.5 rounded whitespace-nowrap">{tNo}</span>
       )}
      </div>
      <div className="flex gap-2 shrink-0">
       <PermissionGate action="view" resource="master_data_items">
        <button
         className="h-8 px-3 flex items-center justify-center bg-surface-container text-foreground rounded-md text-xs font-bold hover:bg-surface-container-high transition-colors"
         onClick={(e) => { e.stopPropagation(); onView(item.id); }}
        >
         {tView}
        </button>
       </PermissionGate>
       <PermissionGate action="edit" resource="master_data_items">
        <button
         className="h-8 px-3 flex items-center justify-center border border-operational-cyan text-operational-cyan rounded-md text-xs font-bold hover:bg-operational-cyan/10 transition-colors"
         onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
        >
         {tEdit}
        </button>
       </PermissionGate>
      </div>
     </div>
    </div>
   )}
  />
 );
}
