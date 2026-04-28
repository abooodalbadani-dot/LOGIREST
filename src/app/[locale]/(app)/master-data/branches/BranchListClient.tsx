'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Building2, CheckCircle2, Search, Shield } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BranchSchema, type Branch } from '@/types/master-data';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';

export function BranchListClient({ locale }: { locale: string }) {
  const t = useTranslations('masterData.branches');
  const tc = useTranslations('masterData');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'branches',
    BranchSchema,
    { page: String(page), ...(search ? { search } : {}) }
  );

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
      header: tc('common.code'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-black text-cyan-500 tracking-widest uppercase px-2 py-0.5 bg-cyan-500/5 rounded-sm border border-cyan-500/10">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: tc('common.name'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
          <span className="text-[10px] text-muted-foreground/60" dir="rtl">{row.original.name_ar}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: tc('common.is_active'),
      cell: ({ row }) => (
        <StatusBadge 
          status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} 
          className="rounded-sm h-5"
        />
      ),
    },
    {
      accessorKey: 'created_at',
      header: t('created_at'),
      cell: ({ row }) => <span dir="ltr" className="text-[10px] text-muted-foreground/60">{format(new Date(row.original.created_at), 'MMM dd, yyyy')}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PermissionGate action="view" resource="master_data">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${locale}/master-data/branches/${row.original.id}`);
              }}
            >
              {tc('common.view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, t, locale, router]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: tc('common.home'), href: `/${locale}/dashboard` },
          { label: tc('common.master_data'), href: `/${locale}/master-data` },
          { label: t('title') }
        ]} />
        <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <PermissionGate action="create" resource="master_data">
            <Link href={`/${locale}/master-data/branches/new`}>
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                <Plus className="w-3.5 h-3.5 me-2" />
                {tc('common.create_new')}
              </Button>
            </Link>
          </PermissionGate>
        }
        />
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={t('total_locations')}
          value={stats.total}
          icon={Building2}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={t('active_status')}
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

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        collectionName="master_data_branches"
        onRowClick={(r: Branch) => router.push(`/${locale}/master-data/branches/${r.id}`)}
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-6 px-8 bg-surface-container-medium/30">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('common.search')}</label>
              <div className="relative">
                <Input
                  placeholder={t('search_placeholder')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-xs font-bold rounded-sm shadow-inner shadow-black/20"
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
