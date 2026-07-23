'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Building2, CheckCircle2, Shield, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { type Branch } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { VirtualizedMobileGrid } from '@/components/shared/VirtualizedMobileGrid';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { ExportMenu } from '@/components/shared/ExportMenu';

export function BranchListClient({ locale }: { locale: string }) {
 const tc = useTranslations('master_data.branches');
 const t = useTranslations('common');
 const router = useRouter();
 const [search, setSearch] = useState('');
 const [page, setPage] = useState(1);
 const debouncedSearch = useDebounce(search, 300);

 const { data, isLoading, isError, refetch } = useBranches({
  search: debouncedSearch || undefined,
 });

 const stats = useMemo(() => {
  const list = data?.data || [];
  return {
   total: data?.meta?.total || 0,
   active: list.filter(b => b.isActive).length,
  };
 }, [data]);

 const columns = useMemo<ColumnDef<Branch, unknown>[]>(() => [
  {
   accessorKey: 'code',
   header: tc('fields.code'),
   cell: ({ row }) => (
    <span className="font-mono text-label-xs font-bold text-foreground uppercase px-2.5 py-1 bg-muted/50 rounded-lg border border-operational-cyan/5 whitespace-nowrap inline-block min-w-max" dir="ltr">
     {row.original.code}
    </span>
   ),
  },
  {
   accessorKey: 'name',
   header: t('name'),
   cell: ({ row }) => (
    <span className="font-bold text-label-sm">{row.original.name}</span>
   ),
  },
  {
   accessorKey: 'isActive',
   header: t('fields.is_active'),
   cell: ({ row }) => (
    <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} className="rounded-lg px-2.5" />
   ),
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-3">
     <PermissionGate action="view" resource="master_data_branches">
      <Button
       variant="ghost"
       size="sm"
       className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
       onClick={(e) => {
        e.stopPropagation();
        router.push(`/master-data/branches/${row.original.id}`);
       }}
      >
       {t('view')}
      </Button>
     </PermissionGate>
     <PermissionGate action="edit" resource="master_data_branches">
      <Button 
       variant="ghost" 
       size="sm" 
       className="text-label-xs font-bold uppercase text-status-warning hover:bg-status-warning/10 h-9 px-4 rounded-xl transition-all"
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
 ], [tc, t, locale, router]);

 if (isLoading) return <PageSkeleton variant="list" />;
 if (isError) return <ErrorState onRetry={refetch} />;

 const breadcrumbs = [
  { label: t('home'), href: `/dashboard` },
  { label: t('master_data'), href: `/master-data` },
  { label: tc('title'), href: `/master-data/branches` },
 ];

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in space-y-8 gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex w-full">
   <Breadcrumb items={breadcrumbs} />

   <PageHeader
    title={tc('title')}
    subtitle={tc('description')}
    children={
     <PermissionGate action="create" resource="master_data_branches">
      <Link href={`/master-data/branches/new`} className="shrink-0 w-full sm:w-auto">
       <Button className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
        <Plus className="w-3.5 h-3.5 me-2" />
        {t('create_new')}
       </Button>
      </Link>
     </PermissionGate>
    }
   />

   <div className="w-full grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
    <MetricCard
     label={t('branches')}
     value={stats.total}
     icon={Building2}
     color="cyan"
     dir="ltr"
    />

    <MetricCard
     label={t('active')}
     value={stats.active}
     icon={CheckCircle2}
     color="emerald"
     dir="ltr"
    />

    <MetricCard
     label={t('operational_compliance')}
     value="100%"
     icon={Shield}
     color="indigo"
     dir="ltr"
    />
   </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    {/* Responsive Search Toolbar */}
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full mb-6">
      <div className="relative w-full sm:w-80 md:w-96 group">
        <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-foreground transition-colors pointer-events-none" />
        <Input
          placeholder={t('search')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full h-11 ps-10 border-none bg-surface-container-high/40 focus:bg-surface-container-high transition-colors text-label-sm font-bold text-foreground shrink-0 rounded-lg"
        />
      </div>

      {data?.data && data.data.length > 0 && (
        <PermissionGate action="export" resource="master_data_branches">
          <div className="flex items-center gap-2 shrink-0">
            <ExportMenu
              data={data.data as unknown as Record<string, unknown>[]}
              columns={[
                { header: 'Code', key: 'code' },
                { header: 'Name', key: 'name' },
                { header: 'Status', key: 'isActive' },
              ]}
              filename="branches"
              title={tc('title') || 'Branches'}
            />
          </div>
        </PermissionGate>
      )}
    </div>

    {/* Desktop Table View */}
    <div className="hidden md:block w-full">
     <DataTable
      columns={columns}
      data={data?.data ?? []}
      isLoading={isLoading}
      enableVirtualization={true}
      collectionName="master_data_branches"
      onRowClick={(r: Branch) => router.push(`/master-data/branches/${r.id}`)}
      emptyState={
       <EmptyState 
        variant="minimal"
        title={t('no_data')}
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

    {/* Mobile Virtualized Grid View */}
    {!isLoading && (data?.data ?? []).length > 0 && (
     <VirtualizedMobileGrid<Branch>
      data={data?.data ?? []}
      estimateSize={120}
      maxHeight={600}
      className="mt-4"
      renderCard={(branch: Branch) => (
       <div 
        key={branch.id} 
        className="bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-lg p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2234]/80 transition-colors"
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
              <span className="text-[11px] font-mono font-bold text-[#b48e67] uppercase">{branch.code}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM TIER: Actions */}
        <div className="flex justify-end items-end pt-2 mt-1 border-t border-gray-100 dark:border-gray-800/50">
          <div className="flex gap-2 shrink-0">
           <PermissionGate action="view" resource="master_data_branches">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-gray-100 dark:bg-card border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors uppercase"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/branches/${branch.id}`); }}
            >
             {t('view')}
            </button>
           </PermissionGate>
           <PermissionGate action="edit" resource="master_data_branches">
            <button 
             className="h-8 px-4 flex items-center justify-center bg-white dark:bg-transparent border border-[#b48e67] text-[#b48e67] rounded-md text-xs font-bold hover:bg-[#b48e67]/10 transition-colors uppercase"
             onClick={(e) => { e.stopPropagation(); router.push(`/master-data/branches/${branch.id}/edit`); }}
            >
             {t('edit')}
            </button>
           </PermissionGate>
          </div>
        </div>
       </div>
      )}
     />
    )}
   </div>
  </div>
 );
}
