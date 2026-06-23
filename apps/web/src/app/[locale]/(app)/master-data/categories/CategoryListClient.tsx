'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Plus, Layers, Search, FolderTree, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ColumnDef } from '@tanstack/react-table';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { type Category } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function CategoryListClient() {
 const t = useTranslations('common');
 const tc = useTranslations('master_data.categories');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data, isLoading, isError, refetch } = useCategories({ search });

 const columns = useMemo<ColumnDef<Category, unknown>[]>(() => [
  {
   accessorKey: 'code',
   header: tc('fields.code'),
   cell: ({ row }) => (
    <span className="font-mono font-bold text-label-xs bg-surface-container-highest/60 border border-surface-variant/10 px-2.5 py-1 rounded text-muted-foreground">
     {row.original.code || row.original.id}
    </span>
   ),
  },
  {
   accessorKey: 'name',
   header: t('name'),
   cell: ({ row }) => (
    <div className="flex items-center gap-3">
     <div className="w-9 h-9 rounded-xl bg-operational-cyan/10 flex items-center justify-center shrink-0">
      <Layers className="w-4 h-4 text-operational-cyan" />
     </div>
     <span className="font-bold text-label-sm">{row.original.name}</span>
    </div>
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
       className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/categories/${row.original.id}`);
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
        router.push(`/master-data/categories/${row.original.id}/edit`);
       }}
      >
       {t('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [t, router]);

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
  { label: tc('title'), href: `/master-data/categories` },
 ];

 return (
  <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 min-w-0">
   <div className="space-y-4">
    <Breadcrumb items={breadcrumbs} />
    <PageHeader
     title={tc('title')}
     subtitle={tc('description')}
     children={
      <PermissionGate action="create" resource="master_data">
       <Link href={`/master-data/categories/new`} className="shrink-0 w-full sm:w-auto">
        <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
         <Plus className="w-3.5 h-3.5 me-2" />
         {t('create_new')}
        </Button>
       </Link>
      </PermissionGate>
     }
    />
   </div>

   <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <MetricCard
     label={tc('metrics.total_categories')}
     value={data?.meta?.total || 0}
     icon={Layers}
     color="cyan"
    />

    <MetricCard
     label={tc('metrics.hierarchy_status')}
     value={tc('metrics.flat')}
     icon={FolderTree}
     color="amber"
    />

    <MetricCard
     label={tc('metrics.mapping_status')}
     value={tc('metrics.optimal')}
     icon={Info}
     color="emerald"
    />
   </div>

   <DataTable
    columns={columns}
    data={data?.data ?? []}
    isLoading={isLoading}
    collectionName="master_data_categories"
    emptyState={
     <EmptyState
      variant="minimal"
      title={t('no_data')}
     />
    }
    onRowClick={(r: Category) => router.push(`/master-data/categories/${r.id}`)}
    filters={
       <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
         <div className="w-full sm:w-80 md:w-96">
           <div className="relative w-full group">
             <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
             <Input
         placeholder={tc('search_placeholder')}
         value={search}
         onChange={ (e) => setSearch(e.target.value) }
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

