'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Home, MapPin, CheckCircle2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';
import { type Warehouse } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';

export function WarehouseListClient({ locale }: { locale: string }) {
 const t = useTranslations('master_data.warehouses');
 const tc = useTranslations('common');
 const router = useRouter();
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);

 const { data, isLoading, isError, refetch } = useWarehouses({ search, includeInactive: true });
 const warehouses = data?.data || [];

 const stats = useMemo(() => ({
  total: data?.meta?.total || 0,
  active: warehouses.filter(w => w.isActive).length,
 }), [data, warehouses]);

 const columns = useMemo<ColumnDef<Warehouse, unknown>[]>(() => [
  {
   accessorKey: 'code',
   header: tc('code'),
   cell: ({ row }) => (
    <span className="font-mono text-label-xs font-bold text-foreground uppercase px-2.5 py-1 bg-muted/50 rounded-lg border border-operational-cyan/5 whitespace-nowrap inline-block min-w-max" dir="ltr">
     {row.original.code}
    </span>
   )
  },
  { 
   accessorKey: 'name', 
   header: tc('name'), 
   cell: ({ row }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
     <span className="font-bold text-label-sm">{row.original.name}</span>
    </div>
   )
  },
  {
   accessorKey: 'isActive', 
   header: tc('fields.is_active'),
   cell: ({ row }) => (
    <StatusBadge 
     status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5"
    />
   )
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-3">
     <PermissionGate action="view" resource="master_data">
      <Button 
       variant="ghost" 
       size="sm" 
       className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/warehouses/${row.original.id}`);
       }}
      >
       {tc('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/warehouses/${row.original.id}/edit`);
       }}
      >
       {tc('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [tc, router]);

 if (isLoading) return <PageSkeleton variant="list" />;
 if (isError) return <ErrorState onRetry={refetch} />;

 return (
  <div className="overflow-x-hidden min-w-0 gap-6 flex-1 fade-in max-w-full slide-in-from-bottom-4 duration-1000 animate-in flex-col flex w-full">
   <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
    <div className="flex flex-col gap-1 min-w-0">
     <Breadcrumb 
      items={[
       { label: tc('home'), href: `/dashboard` },
       { label: tc('master_data'), href: `/master-data` },
       { label: t('title') }
      ]} 
     />
     <PageHeader 
      title={t('title')} 
      subtitle={t('description')}
      className="pb-0"
     />
    </div>
    <div className="shrink-0 mt-4 sm:mt-0">
     <PermissionGate action="create" resource="master_data">
      <Link href={`/master-data/warehouses/new`} className="shrink-0 w-full sm:w-auto">
       <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <Plus className="w-3.5 h-3.5 me-2" />
        {tc('create_new')}
       </Button>
      </Link>
     </PermissionGate>
    </div>
   </div>

   <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <MetricCard
     label={t('total_locations')}
     value={stats.total}
     icon={Home}
     color="cyan"
     dir="ltr"
    />

    <MetricCard
     label={tc('statuses.active')}
     value={stats.active}
     icon={CheckCircle2}
     color="emerald"
     dir="ltr"
    />

    <MetricCard
     label={tc('statuses.inactive')}
     value={stats.total - stats.active}
     icon={MapPin}
     color="rose"
     dir="ltr"
    />
   </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
     <DataTable 
      columns={columns} 
      data={warehouses} 
      isLoading={isLoading}
      collectionName="master_data_warehouses"
      onRowClick={(r: Warehouse) => router.push(`/master-data/warehouses/${r.id}`)}
      emptyState={
       <EmptyState 
        variant="minimal"
        title={tc('no_data')}
       />
      }
      filters={
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-80 md:w-96">
            <div className="relative w-full group">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
              <Input
         placeholder={tc('search')}
         value={search}
         onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
        />
            </div>
          </div>
        </div>
       }
     />
    </div>

    {!isLoading && warehouses.length > 0 && (
     <div className="flex flex-col gap-3 md:hidden mt-4">
      {warehouses.map((warehouse) => (
       <div 
        key={warehouse.id} 
        className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2234]/80 transition-colors"
        onClick={() => router.push(`/master-data/warehouses/${warehouse.id}`)}
       >
        
        {/* TOP TIER: Identity & Status */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            {/* Name & Status Inline */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{warehouse.name}</span>
              <StatusBadge status={warehouse.isActive ? 'ACTIVE' : 'INACTIVE'} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
            </div>
            {/* Codes Inline */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-[#b48e67] uppercase">{warehouse.code}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM TIER: Actions */}
        <div className="flex justify-end items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
          {/* Compact Touch-Friendly Buttons (h-8 is enough for lists) */}
          <div className="flex gap-2 shrink-0">
           <PermissionGate action="view" resource="master_data">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-gray-100 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/warehouses/${warehouse.id}`); }}
            >
             {tc('view')}
            </button>
           </PermissionGate>
           <PermissionGate action="edit" resource="master_data">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-white dark:bg-transparent border border-[#b48e67] text-[#b48e67] rounded-md text-xs font-bold hover:bg-[#b48e67]/10 transition-colors"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/warehouses/${warehouse.id}/edit`); }}
            >
             {tc('edit')}
            </button>
           </PermissionGate>
          </div>
        </div>
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
}
