'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Package, CheckCircle2, Search, Barcode, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useItems } from '@/features/items/hooks/useItems';
import { type Item } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function ItemListClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const ti = useTranslations('master_data.items');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data, isLoading, isError, refetch } = useItems({ search });

 const stats = useMemo(() => {
  const items = data?.data ?? [];
  return {
   total: items.length,
   active: items.filter(i => i.isActive).length,
   trackingLots: items.filter(i => i.trackLots).length,
  };
 }, [data]);

 const columns = useMemo<ColumnDef<Item, unknown>[]>(() => [
  { 
   accessorKey: 'code', 
   header: t('code'), 
   cell: ({ row }) => (
    <div className="flex flex-col gap-1 min-w-0">
     <span className="font-mono text-operational-cyan font-bold uppercase text-label-xs bg-operational-cyan/10 px-2 py-0.5 rounded-lg border border-operational-cyan/5 w-fit whitespace-nowrap inline-block min-w-max" dir="ltr">{row.original.code}</span>
     <span className="text-label-xxs text-muted-foreground/60 font-medium font-mono flex items-center gap-1.5 ps-1" dir="ltr">
      <Barcode className="w-3 h-3 opacity-40" />
      {row.original.barcode || '—'}
     </span>
    </div>
   )
  },
  { 
   accessorKey: 'name', 
   header: t('name'), 
   cell: ({ row }) => (
    <span className="font-bold text-label-sm">{row.original.name}</span>
   )
  },
  { 
   accessorKey: 'base_unit', 
   header: ti('fields.base_unit'), 
   cell: ({ row }) => (
    <span className="text-label-xs font-bold uppercase text-muted-foreground/80 px-2 py-0.5 bg-surface-container rounded-lg">
     {row.original.primaryUom.code}
    </span>
   )
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
     <PermissionGate action="view" resource="master_data">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-operational-cyan hover:bg-operational-cyan/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/items/${row.original.id}`);
       }}
      >
       {t('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data">
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
  <div className="w-full flex flex-col gap-6 items-start animate-in fade-in slide-in-from-bottom-4 duration-1000 min-w-0">
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
     <PermissionGate action="create" resource="master_data">
      <Link href={`/master-data/items/new`} className="shrink-0 w-full sm:w-auto">
       <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-sm shadow-operational-cyan/20">
        <Plus className="w-3.5 h-3.5 me-2" />
        {t('create_new')}
       </Button>
      </Link>
     </PermissionGate>
    </div>
   </div>

   <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
    <DataTable 
     columns={columns} 
     data={data?.data ?? []} 
     isLoading={isLoading}
     collectionName="master_data_items"
     emptyState={
      <EmptyState 
       variant="minimal"
       title={t('no_data')}
      />
     }
     onRowClick={(r: Item) => router.push(`/master-data/items/${r.id}`)}
     filters={
       <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
         <div className="w-full sm:w-80 md:w-96">
           <div className="relative w-full group">
             <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
             <Input
        placeholder={ti('search_placeholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
       />
           </div>
         </div>
       </div>
      }
    />
   </div>
  </div>
 );
}
