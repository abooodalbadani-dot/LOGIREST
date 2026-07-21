'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Ruler, Search, Scale, BoxSelect } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { type UoM } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ExportMenu } from '@/components/shared/ExportMenu';

export function UoMListClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const tu = useTranslations('master_data.uoms');
 const router = useRouter();
 const [search, setSearch] = useState('');
 const debouncedSearch = useDebounce(search, 300);

 const { data, isLoading, isError, refetch } = useUoMs({ search: debouncedSearch || undefined });

 const columns = useMemo<ColumnDef<UoM, unknown>[]>(() => [
  { 
   accessorKey: 'code', 
   header: t('code'), 
   cell: ({ row }) => (
    <span className="font-mono text-label-xs font-bold text-foreground uppercase px-2.5 py-1 bg-muted/50 rounded-lg border border-operational-cyan/5 whitespace-nowrap inline-block min-w-max" dir="ltr">
     {row.original.code}
    </span>
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
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-3">
     <PermissionGate action="view" resource="master_data_units_of_measure">
      <Button 
       variant="ghost" 
       size="sm" 
       className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/units-of-measure/${row.original.id}`);
       }}
      >
       {t('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data_units_of_measure">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/units-of-measure/${row.original.id}/edit`);
       }}
      >
       {t('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [t, router, locale]);

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
  { label: tu('title'), href: `/master-data/units-of-measure` }
 ];

 return (
  <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 min-w-0">
   <div className="space-y-4">
    <Breadcrumb items={breadcrumbs} />
    <PageHeader 
     title={tu('title')} 
     subtitle={tu('description')}
     children={
      <PermissionGate action="create" resource="master_data_units_of_measure">
       <Link href={`/master-data/units-of-measure/new`} className="shrink-0 w-full sm:w-auto">
        <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
         <Plus className="w-3.5 h-3.5 me-2" />
         {t('create_new')}
        </Button>
       </Link>
      </PermissionGate>
     }
    />
   </div>

   <div className="w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
    <MetricCard
     label={tu('metrics.total_uoms')}
     value={data?.meta?.total || 0}
     icon={Ruler}
     color="cyan"
     dir="ltr"
    />

    <MetricCard
     label={tu('metrics.precision')}
     value={tu('metrics.high')}
     icon={Scale}
     color="amber"
     dir="ltr"
    />

    <MetricCard
     label={tu('metrics.sync_status')}
     value={tu('metrics.synced')}
     icon={BoxSelect}
     color="emerald"
     dir="ltr"
    />
   </div>

   {/* Responsive Search Toolbar */}
   <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-2">
    <div className="relative w-full sm:w-80 md:w-96 group">
     <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
     <Input
      placeholder={t('search') || 'Search...'}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
     />
    </div>

    {data?.data && data.data.length > 0 && (
     <PermissionGate action="export" resource="master_data_units_of_measure">
      <div className="flex items-center gap-2 shrink-0">
       <ExportMenu
        data={data.data as unknown as Record<string, unknown>[]}
        columns={[
         { header: 'Code', key: 'code' },
         { header: 'Name', key: 'name' },
        ]}
        filename="units_of_measure"
        title={tu('title') || 'Units of Measure'}
       />
      </div>
     </PermissionGate>
    )}
   </div>

   <DataTable 
    columns={columns} 
    data={data?.data ?? []} 
    isLoading={isLoading}
    enableVirtualization={true}
    collectionName="master_data_units_of_measure"
    onRowClick={(r: UoM) => router.push(`/master-data/units-of-measure/${r.id}`)}
    emptyState={
     <EmptyState 
      variant="minimal"
      title={t('no_data')}
     />
    }
    renderMobileCard={(item: UoM) => (
     <div
      onClick={() => router.push(`/master-data/units-of-measure/${item.id}`)}
      className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all cursor-pointer hover:border-brand-gold/30 space-y-3"
     >
      {/* UoM Identity: Icon + Name + Code */}
      <div className="flex items-center gap-3 min-w-0 w-full">
       <div className="w-10 h-10 rounded-xl bg-operational-cyan/10 border border-operational-cyan/20 flex items-center justify-center shrink-0">
        <Ruler className="w-5 h-5 text-operational-cyan" />
       </div>
       <div className="flex flex-col min-w-0 flex-1 text-start items-start">
        <span className="text-sm font-bold text-foreground truncate w-full" title={item.name}>
         {item.name}
        </span>
        <div className="flex items-center gap-2 mt-1">
         <span className="font-mono font-bold text-[11px] bg-muted/50 border border-operational-cyan/10 px-2.5 py-0.5 rounded-lg text-foreground uppercase text-start rtl:text-right ltr:text-left" dir="ltr">
          {item.code}
         </span>
        </div>
       </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40 w-full">
       <PermissionGate action="view" resource="master_data_units_of_measure">
        <Button
         variant="ghost"
         size="sm"
         className="h-8 px-4 bg-[#0B1220] text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center text-xs"
         onClick={(e) => {
          e.stopPropagation();
          router.push(`/master-data/units-of-measure/${item.id}`);
         }}
        >
         {t('view')}
        </Button>
       </PermissionGate>
       <PermissionGate action="edit" resource="master_data_units_of_measure">
        <Button
         variant="ghost"
         size="sm"
         className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-8 px-3.5 rounded-xl transition-all"
         onClick={(e) => {
          e.stopPropagation();
          router.push(`/master-data/units-of-measure/${item.id}/edit`);
         }}
        >
         {t('edit')}
        </Button>
       </PermissionGate>
      </div>
     </div>
    )}
    filters={
       <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
         <div className="w-full sm:w-80 md:w-96">
           <div className="relative w-full group">
             <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
             <Input
         placeholder={tu('search_placeholder')}
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
 );
}
