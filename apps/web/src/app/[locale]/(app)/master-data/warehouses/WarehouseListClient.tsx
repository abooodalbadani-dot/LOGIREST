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

 const { data, isLoading, isError, refetch } = useWarehouses({ search });
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
       className="text-label-xs font-bold uppercase text-operational-cyan hover:bg-operational-cyan/10 h-9 px-4 rounded-xl transition-all"
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
  <div className="overflow-x-hidden md:p-8 min-w-0 gap-6 flex-1 sm:p-6 fade-in p-4 max-w-full slide-in-from-bottom-4 duration-1000 animate-in flex-col flex w-full">
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
      description={t('description')}
      className="pb-0"
     />
    </div>
    <div className="shrink-0 mt-4 sm:mt-0">
     <PermissionGate action="create" resource="master_data">
      <Link href={`/master-data/warehouses/new`}>
       <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-sm shadow-operational-cyan/20">
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

   <div className="w-full flex flex-col gap-4 bg-card border border-border rounded-lg p-4 min-w-0">
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
      <div className="relative w-full flex-1 shrink-0 group sm:max-w-xl lg:max-w-2xl">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
        <Input
         placeholder={tc('search')}
         value={search}
         onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
        />
       </div>
     }
    />
   </div>
  </div>
 );
}
