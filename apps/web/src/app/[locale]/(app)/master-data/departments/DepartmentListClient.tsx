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
    <span dir="ltr" className="font-mono text-label-xs font-semibold text-cyan-500 uppercase px-2 py-0.5 bg-cyan-500/5 rounded-sm whitespace-nowrap inline-block min-w-max">
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
     <PermissionGate action="view" resource="master_data">
      <Button
       variant="ghost"
       size="sm"
       className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/departments/${row.original.id}`);
       }}
      >
       {tc('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data">
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
  <div className="overflow-x-hidden md:p-8 min-w-0 gap-6 flex-1 sm:p-6 fade-in p-4 max-w-full slide-in-from-bottom-4 duration-1000 animate-in flex-col flex w-full">
   <div className="space-y-4">
    <Breadcrumb items={[
     { label: tc('home'), href: `/dashboard` },
     { label: tc('master_data'), href: `/master-data` },
     { label: t('title') }
    ]} />
    <PageHeader
     title={t('title')}
     description={t('description')}
     actions={
      <PermissionGate action="create" resource="master_data">
       <Link href={`/master-data/departments/new`}>
        <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-sm shadow-operational-cyan/20">
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
      <div className="relative w-full sm:max-w-md flex-1 shrink-0 min-w-[250px]">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
         placeholder={tc('search')}
         value={search}
         onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full ps-10 pe-4 bg-background border-border text-foreground focus:ring-operational-cyan focus:border-operational-cyan shadow-sm transition-all rounded-lg"
        />
       </div>
     }
   />
  </div>
 );
}
