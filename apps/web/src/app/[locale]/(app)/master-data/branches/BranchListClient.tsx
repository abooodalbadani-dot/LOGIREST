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
 const [_page, setPage] = useState(1);
 const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useBranches({ search });

 const stats = useMemo(() => {
 const branches = data?.data || [];
 return {
 total: data?.meta?.total || 0,
 active: branches.filter(b => b.is_active).length,
 };
 }, [data]);

  const columns = useMemo<ColumnDef<Branch, unknown>[]>(() => [
    {
      accessorKey: 'code',
      header: t('fields.code'),
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-label-xs font-semibold text-cyan-500 uppercase px-2 py-0.5 bg-cyan-500/5 rounded-sm">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: tc('name'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-label-sm">{row.original.name_en}</span>
          <span className="text-label-xs text-muted-foreground/60" dir="rtl">{row.original.name_ar}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: t('fields.is_active'),
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} className="rounded-sm h-5"
        />
      ),
    },
    {
      accessorKey: 'created_at',
      header: tc('created_at'),
      cell: ({ row }) => (
        <ClientOnlyTime 
          date={row.original.created_at} 
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
              className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
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
              className="text-label-xs font-semibold uppercase text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 h-7"
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

  if (isLoading && !data) return <PageSkeleton variant="list" />;
  if (isError) return <ErrorState error={500} onRetry={() => refetch()} />;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
              <Link href={`/master-data/branches/new`}>
                <Button className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-lg shadow-operational-cyan/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {tc('create')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

 {/* KPI Section */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={tc('total_locations')}
 value={stats.total}
 icon={Building2}
 color="cyan"
 dir="ltr"
 />

 <MetricCard
 label={tc('status.active')}
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

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        collectionName="master_data_branches"
        onRowClick={(r: Branch) => router.push(`/master-data/branches/${r.id}`)}
        emptyState={
          <EmptyState 
            title={t('empty.title')}
            description={t('empty.description')}
            action={
              <PermissionGate action="create" resource="master_data">
                <Link href={`/master-data/branches/new`}>
                  <Button className="h-10 px-6 bg-operational-cyan hover:bg-operational-cyan/90 text-white text-label-xs font-semibold uppercase rounded-xl transition-all shadow-lg shadow-operational-cyan/20">
                    <Plus className="w-3.5 h-3.5 me-2" />
                    {tc('create')}
                  </Button>
                </Link>
              </PermissionGate>
            }
          />
        }
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tc('search')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-label-sm font-bold rounded-sm shadow-inner shadow-black/20"
                />
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
