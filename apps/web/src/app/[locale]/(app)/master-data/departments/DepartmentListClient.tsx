'use client';

import { useState, useMemo } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { Plus, Briefcase, Search, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useDepartments } from '@/features/departments/hooks/useDepartments';
import { type Department } from '@/types/master-data';
import { MetricCard } from '@/components/ui/metric-card';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusBadge';

export function DepartmentListClient({ locale }: { locale: string }) {
 const tc = useTranslations('common');
 const t = useTranslations('master_data.departments');
 const router = useRouter();
 const [_page, setPage] = useState(1);
 const [search, setSearch] = useState('');

 const { data: queryData, isLoading, isError, refetch } = useDepartments({ search });
 const departments = queryData?.data || [];

 const stats = useMemo(() => {
  return {
   total: departments.length,
   active: departments.filter(d => d.isActive).length,
  };
 }, [departments]);

 const columns = useMemo<ColumnDef<Department, unknown>[]>(() => [
  {
   accessorKey: 'code',
   header: t('fields.code'),
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono text-label-xs font-semibold text-foreground uppercase px-2 py-0.5 bg-muted/50 rounded-sm whitespace-nowrap inline-block min-w-max">
     {row.original.code}
    </span>
   ),
  },
  {
   accessorKey: 'name',
   header: tc('name'),
   cell: ({ row }) => (
    <div className="flex flex-col gap-0.5 min-w-0">
     <span className="font-bold text-label-sm">{row.original.name}</span>
    </div>
   ),
  },
  {
   accessorKey: 'isActive',
   header: t('fields.is_active'),
   cell: ({ row }) => (
    <StatusBadge
     status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-sm h-5"
    />
   ),
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-2">
     <PermissionGate action="view" resource="master_data_departments">
      <Button
       variant="ghost"
       size="sm"
       className="text-xs font-bold tracking-wider text-muted-foreground hover:text-brand-gold uppercase transition-colors h-8 px-3 rounded-lg"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/departments/${row.original.id}`);
       }}
      >
       {tc('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data_departments">
      <Button
       variant="ghost"
       size="sm"
       className="text-label-xs font-semibold uppercase text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-7"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/departments/${row.original.id}/edit`);
       }}
      >
       {tc('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [tc, t, locale, router]);

 if (isLoading && !queryData) return <PageSkeleton variant="list" />;
 if (isError) return <ErrorState error={500} onRetry={() => refetch()} />;

 return (
  <div className="overflow-x-hidden min-w-0 gap-6 flex-1 fade-in max-w-full slide-in-from-bottom-4 duration-1000 animate-in flex-col flex w-full">
   <div className="space-y-4">
    <Breadcrumb items={[
     { label: tc('home'), href: `/dashboard` },
     { label: tc('master_data'), href: `/master-data` },
     { label: t('title') }
    ]} />
    <PageHeader
     title={t('title')}
     subtitle={t('description')}
     children={
      <PermissionGate action="create" resource="master_data_departments">
       <Link href={`/master-data/departments/new`} className="shrink-0 w-full sm:w-auto">
        <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
         <Plus className="w-3.5 h-3.5 me-2" />
         {tc('create')}
        </Button>
       </Link>
      </PermissionGate>
     }
    />
   </div>

   <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <MetricCard
     label={tc('total_locations')}
     value={stats.total}
     icon={Briefcase}
     color="cyan"
     dir="ltr"
    />

    <MetricCard
     label={tc('statuses.active')}
     value={stats.active}
     icon={Layers}
     color="amber"
     dir="ltr"
    />

    <MetricCard
     label={t('description')}
     value={tc('verified')}
     icon={ShieldCheck}
     color="emerald"
     dir="ltr"
    />
   </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
     <DataTable
      columns={columns}
      data={departments}
      isLoading={isLoading}
      collectionName="master_data_departments"
      onRowClick={(r: Department) => router.push(`/master-data/departments/${r.id}`)}
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

    {!isLoading && departments.length > 0 && (
     <div className="flex flex-col gap-3 md:hidden mt-4">
      {departments.map((department: Department) => (
       <div 
        key={department.id} 
        className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2234]/80 transition-colors"
        onClick={() => router.push(`/master-data/departments/${department.id}`)}
       >
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{department.name}</span>
              <StatusBadge status={department.isActive ? 'ACTIVE' : 'INACTIVE'} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-[#b48e67] uppercase">{department.code}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex gap-2 shrink-0">
           <PermissionGate action="view" resource="master_data_departments">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-gray-100 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors uppercase"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/departments/${department.id}`); }}
            >
             {tc('view')}
            </button>
           </PermissionGate>
           <PermissionGate action="edit" resource="master_data_departments">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-white dark:bg-transparent border border-[#b48e67] text-[#b48e67] rounded-md text-xs font-bold hover:bg-[#b48e67]/10 transition-colors uppercase"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/departments/${department.id}/edit`); }}
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
