'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Briefcase, CheckCircle2, Search, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { DepartmentSchema, type Department } from '@/types/master-data';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function DepartmentListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const tu = useTranslations('masterData.departments');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'departments', 
    DepartmentSchema, 
    { page: String(page), ...(search ? { search } : {}) }
  );

  const stats = useMemo(() => {
    const departments = data?.data || [];
    return {
      total: data?.meta?.total || 0,
      active: departments.filter(d => d.is_active).length,
    };
  }, [data]);

  const columns = useMemo<ColumnDef<Department, unknown>[]>(() => [
    {
      accessorKey: 'code',
      header: tc('code'),
      meta: { numeric: true },
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-black text-cyan-500 tracking-widest uppercase px-2 py-0.5 bg-cyan-500/5 rounded-sm border border-cyan-500/10">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: tc('name'),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
          <span className="text-[10px] text-muted-foreground/60" dir="rtl">{row.original.name_ar}</span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: tc('is_active'),
      cell: ({ row }) => row.original.is_active
        ? <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2 h-5 rounded-sm">
            {tc('active')}
          </Badge>
        : <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] font-black uppercase tracking-widest px-2 h-5 rounded-sm">
            {tc('inactive')}
          </Badge>,
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
                router.push(`/${locale}/master-data/departments/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, locale, router]);

  const breadcrumbs = [
    { label: tc('master_data'), href: `/${locale}/master-data` },
    { label: tc('departments'), href: `/${locale}/master-data/departments` }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader 
          title={tc('departments') || 'Organizational Units'} 
          description={tc('departments_desc') || "Structural segmentation of operations and cost-center mapping"}
          actions={
            <PermissionGate action="create" resource="master_data">
              <Link href={`/${locale}/master-data/departments/new`}>
                <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-sm transition-all shadow-lg shadow-cyan-900/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {tc('create_new')}
                </Button>
              </Link>
            </PermissionGate>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={tu('total_units')}
          value={stats.total}
          icon={Briefcase}
          color="cyan"
          dir="ltr"
        />

        <MetricCard
          label={tu('active_capacity')}
          value={stats.active}
          icon={Layers}
          color="amber"
          dir="ltr"
        />

        <MetricCard
          label={tu('structural_audit')}
          value={tc('verified')}
          icon={ShieldCheck}
          color="emerald"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_departments"
        onRowClick={(r: Department) => router.push(`/${locale}/master-data/departments/${r.id}`)}
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tc('search_departments_placeholder') || "Filter departments by name or code..."}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-11 ps-10 text-xs font-bold"
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
