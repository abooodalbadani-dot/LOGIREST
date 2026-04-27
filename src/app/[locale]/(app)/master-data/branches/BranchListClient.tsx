'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Building2, CheckCircle2, Search, Shield } from 'lucide-react';
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

  const columns: ColumnDef<Branch, unknown>[] = [
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
      cell: ({ row }) => row.original.is_active
        ? <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2 h-5 rounded-sm">
          {tc('common.active')}
        </Badge>
        : <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] font-black uppercase tracking-widest px-2 h-5 rounded-sm">
          {tc('common.inactive')}
        </Badge>,
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
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: tc('common.home'), href: `/${locale}/dashboard` },
          { label: tc('common.master_data') },
          { label: t('title') }
        ]} />
        <PageHeader
          title={t('title') || 'Branch Operations'}
          description={t('description') || 'Management of physical locations and operational nodes'}
          actions={
            <Link href={`/${locale}/master-data/branches/new`}>
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                <Plus className="w-3.5 h-3.5 mr-2" />
                {tc('common.create_new')}
              </Button>
            </Link>
          }
        />
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Building2 className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('total_locations')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground" dir="ltr">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <CheckCircle2 className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('active_status')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400" dir="ltr">{stats.active}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden relative group transition-all hover:bg-surface-container-medium">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Shield className="w-24 h-24 text-indigo-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('operational_compliance')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-indigo-400" dir="ltr">100%</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-indigo-500/50 to-transparent" />
        </Card>
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
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-white/5 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('common.search')}</label>
              <div className="relative">
                <Input
                  placeholder={t('search_placeholder')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-11 px-11 text-xs font-bold"
                />
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
