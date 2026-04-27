'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Home, MapPin, CheckCircle2, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { WarehouseSchema, type Warehouse } from '@/types/master-data';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';

import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function WarehouseListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const t = useTranslations('masterData.warehouses');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const WAREHOUSE_TYPE_STYLES: Record<string, { label: string, color: string, shadow: string }> = {
    MAIN: { label: t('types.main'), color: 'text-blue-400', shadow: 'shadow-[0_0_8px_rgba(96,165,250,0.4)]' },
    DRY: { label: t('types.dry'), color: 'text-amber-400', shadow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]' },
    COLD: { label: t('types.cold'), color: 'text-cyan-400', shadow: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]' },
    VIRTUAL: { label: t('types.virtual'), color: 'text-indigo-400', shadow: 'shadow-[0_0_8px_rgba(129,140,248,0.4)]' }
  };

  const { data, isLoading } = useMasterDataList(
    'warehouses', 
    WarehouseSchema, 
    { page: String(page), ...(search ? { search } : {}) }
  );

  const stats = useMemo(() => {
    const warehouses = data?.data || [];
    return {
      total: data?.meta?.total || 0,
      active: warehouses.filter(w => w.is_active).length,
      physical: warehouses.filter(w => w.type !== 'VIRTUAL').length
    };
  }, [data]);

  const columns: ColumnDef<Warehouse, unknown>[] = [
    { 
      accessorKey: 'code', 
      header: tc('code'), 
      meta: { numeric: true },
      cell: ({ row }) => <span className="font-mono text-cyan-500/90 font-bold tracking-wider">{row.original.code}</span> 
    },
    { 
      accessorKey: 'name', 
      header: tc('name'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
          <span className="text-[10px] opacity-40" dir="rtl">{row.original.name_ar}</span>
        </div>
      )
    },
    {
      accessorKey: 'type', 
      header: t('type'),
      cell: ({ row }) => {
        const style = WAREHOUSE_TYPE_STYLES[row.original.type] || { label: row.original.type, color: 'text-muted-foreground', shadow: '' };
        return (
          <div className={`flex items-center gap-2 ${style.color} font-black text-[9px] uppercase tracking-widest`}>
            <div className={`w-1.5 h-1.5 rounded-full bg-current ${style.shadow}`} />
            {style.label}
          </div>
        );
      }
    },
    {
      accessorKey: 'is_active', 
      header: tc('is_active'),
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'outline'} className="text-[9px] font-black uppercase tracking-widest rounded-xl">
          {row.original.is_active ? tc('active') : tc('inactive')}
        </Badge>
      )
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
              router.push(`/${locale}/master-data/warehouses/${row.original.id}`);
            }}
          >
            {tc('view')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb 
          items={[
            { label: tc('master_data'), href: `/${locale}/master-data` },
            { label: t('title') }
          ]} 
        />
        <PageHeader 
          title={t('title')} 
          description={t('description')}
          actions={
            <Link href={`/${locale}/master-data/warehouses/new`}>
              <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl transition-all shadow-lg shadow-cyan-900/20">
                <Plus className="w-3.5 h-3.5 me-2" />
                {tc('create_new')}
              </Button>
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium shadow-xl shadow-primary/5">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <Home className="w-24 h-24 text-white" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('total_warehouses')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">{stats.total}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium shadow-xl shadow-primary/5">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <CheckCircle2 className="w-24 h-24 text-emerald-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{tc('active')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-emerald-400">{stats.active}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-emerald-500/50 to-transparent" />
        </Card>

        <Card className="bg-surface-container-low border-none rounded-2xl overflow-hidden relative group transition-all hover:bg-surface-container-medium shadow-xl shadow-primary/5">
          <div className="absolute top-0 end-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <MapPin className="w-24 h-24 text-cyan-400" />
          </div>
          <CardHeader className="pb-2 relative z-10">
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('physical_sites')}</CardDescription>
            <CardTitle className="text-4xl font-display font-bold tracking-tight text-cyan-400">{stats.physical}</CardTitle>
          </CardHeader>
          <div className="absolute bottom-0 start-0 h-0.5 w-full bg-gradient-to-r from-cyan-500/50 to-transparent" />
        </Card>
      </div>

      <div className="bg-surface-container-low shadow-2xl shadow-primary/10 rounded-2xl overflow-hidden">
        <DataTable 
          columns={columns} 
          data={data?.data ?? []} 
          isLoading={isLoading}
          collectionName="master_data_warehouses"
          onRowClick={(r: Warehouse) => router.push(`/${locale}/master-data/warehouses/${r.id}`)}
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
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">{tc('search')}</label>
                <div className="relative">
                  <Input
                    placeholder={t('search_placeholder')}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full bg-surface-container-highest/30 border-none h-12 px-12 text-xs font-bold rounded-2xl shadow-inner shadow-black/20"
                  />
                  <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                </div>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
