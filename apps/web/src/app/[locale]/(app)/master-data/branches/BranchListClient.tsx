'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Plus, Building2, CheckCircle2, Search, Shield } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { type Branch } from '@/types/master-data';
import { ColumnDef } from '@tanstack/react-table';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';

export function BranchListClient({ locale }: { locale: string }) {
 const t = useTranslations('master_data.branches');
 const tc = useTranslations('common');
 const router = useRouter();
 const [, setPage] = useState(1);
 const [search, setSearch] = useState('');

 const { data, isLoading, isError, refetch } = useBranches({ search });

 const stats = useMemo(() => {
 const branches = data?.data || [];
 return {
 total: data?.meta?.total || 0,
 active: branches.filter(b => b.isActive).length,
 };
 }, [data]);

 const columns = useMemo<ColumnDef<Branch, unknown>[]>(() => [
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
   accessorKey: 'createdAt',
   header: tc('created_at'),
   cell: ({ row }) => (
    <ClientOnlyTime 
     date={row.original.createdAt} 
     mode="date" 
     className="text-label-xs text-muted-foreground/60 font-medium" 
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
       className="text-xs font-bold tracking-wider text-muted-foreground hover:text-brand-gold uppercase transition-colors h-8 px-3 rounded-lg"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/branches/${row.original.id}`);
       }}
      >
       {tc('view')}
      </Button>
     </PermissionGate>
     
     <PermissionGate action="edit" resource="master_data">
      <Button
       variant="ghost"
       size="sm"
       className="text-xs font-bold tracking-wider text-brand-gold hover:text-brand-gold-hover uppercase transition-colors h-8 px-3 rounded-lg"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/branches/${row.original.id}/edit`);
       }}
      >
       {t('edit')}
      </Button>
     </PermissionGate>
    </div>
   ),
  },
 ], [tc, t, router]);

 if (isLoading && !data) return <PageSkeleton variant="list" />;
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
      <PermissionGate action="create" resource="master_data">
       <Link href={`/master-data/branches/new`} className="shrink-0 w-full sm:w-auto">
        <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-sm shadow-operational-cyan/20">
         <Plus className="w-3.5 h-3.5 me-2" />
         {tc('create')}
        </Button>
       </Link>
      </PermissionGate>
     }
    />
   </div>

 {/* KPI Section */}
 <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 <MetricCard
 label={tc('total_locations')}
 value={stats.total}
 icon={Building2}
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
 label={t('description')}
 value="100%"
 icon={Shield}
 color="indigo"
 dir="ltr"
 />
 </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
     <DataTable
      columns={columns}
      data={data?.data ?? []}
      isLoading={isLoading}
      collectionName="master_data_branches"
      onRowClick={(r: Branch) => router.push(`/master-data/branches/${r.id}`)}
      emptyState={
       <EmptyState 
        variant="minimal"
        title={tc('no_data')}
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

    {!isLoading && (data?.data ?? []).length > 0 && (
     <div className="flex flex-col gap-3 md:hidden mt-4">
      {(data?.data ?? []).map((branch) => (
       <div 
        key={branch.id} 
        className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2234]/80 transition-colors"
        onClick={() => router.push(`/master-data/branches/${branch.id}`)}
       >
        
        {/* TOP TIER: Identity */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1 w-full">
            {/* Name & Status Inline */}
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{branch.name}</span>
              <StatusBadge status={branch.isActive ? 'ACTIVE' : 'INACTIVE'} className="px-1.5 py-0.5 text-[9px] rounded-md h-auto shrink-0" />
            </div>
            {/* Codes Inline */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-[#D4AF37] uppercase">{branch.code}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM TIER: Actions */}
        <div className="flex justify-end items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex gap-2 shrink-0">
           <PermissionGate action="view" resource="master_data">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-gray-100 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors uppercase"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/branches/${branch.id}`); }}
            >
             {tc('view')}
            </button>
           </PermissionGate>
           <PermissionGate action="edit" resource="master_data">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-white dark:bg-transparent border border-[#D4AF37] text-[#D4AF37] rounded-md text-xs font-bold hover:bg-[#D4AF37]/10 transition-colors uppercase"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/branches/${branch.id}/edit`); }}
            >
             {t('edit')}
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
