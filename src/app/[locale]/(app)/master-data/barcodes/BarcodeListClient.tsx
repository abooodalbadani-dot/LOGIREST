'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Barcode as BarcodeIcon, Tag, Search, Box } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { BarcodeSchema, type Barcode } from '@/types/master-data';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function BarcodeListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const tb = useTranslations('masterData.barcodes');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'barcodes', 
    BarcodeSchema, 
    { page: String(page), ...(search ? { search } : {}) }
  );

  const stats = useMemo(() => {
    const barcodes = data?.data || [];
    const uniqueItems = new Set(barcodes.map(b => b.item_id)).size;
    return {
      total: data?.meta?.total || 0,
      uniqueSKUs: uniqueItems,
    };
  }, [data]);

  const columns = useMemo<ColumnDef<Barcode, unknown>[]>(() => [
    { 
      accessorKey: 'barcode', 
      header: tb('barcode_label'), 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BarcodeIcon className="w-3.5 h-3.5 text-status-active/50" />
          <span dir="ltr" className="font-mono text-xs font-semibold text-status-active tracking-[0.08em] uppercase">
            {row.original.barcode}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'item_id', 
      header: tb('item'), 
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs tracking-tight">{row.original.item_id}</span>
          <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">{tb('sku_link_verified')}</span>
        </div>
      )
    },
    { 
      accessorKey: 'default_qty', 
      header: tb('default_qty'), 
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-semibold text-status-active bg-status-active/10 px-2 py-0.5 rounded-md border border-status-active/20">
          {row.original.default_qty}
        </span>
      )
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
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-status-active hover:text-status-active hover:bg-status-active/10 h-7"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/${locale}/master-data/barcodes/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, tb, locale, router]);

  const breadcrumbs = [
    { label: tc('master_data'), href: `/${locale}/master-data` },
    { label: tb('title'), href: '#' }
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <Breadcrumb items={breadcrumbs} />

      <PageHeader 
        title={tb('title')} 
        description={tb('description')}
        actions={
            <PermissionGate action="create" resource="master_data">
              <Link href={`/${locale}/master-data/barcodes/new`}>
                <Button className="h-11 px-8 bg-status-active hover:bg-status-active/90 text-white text-[10px] font-semibold uppercase tracking-[0.08em] rounded-md transition-all shadow-lg shadow-status-active/20">
                  <Plus className="w-3.5 h-3.5 me-2" />
                  {tc('create_new')}
                </Button>
              </Link>
            </PermissionGate>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label={tb('total_identities')}
          value={stats.total}
          icon={BarcodeIcon}
          color="primary"
          dir="ltr"
        />

        <MetricCard
          label={tb('linked_assets')}
          value={stats.uniqueSKUs}
          icon={Box}
          color="secondary"
          dir="ltr"
        />

        <MetricCard
          label={tb('active_mappings')}
          value="100%"
          icon={Tag}
          color="primary"
          dir="ltr"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_barcodes"
        onRowClick={(r: Barcode) => router.push(`/${locale}/master-data/barcodes/${r.id}`)}
        pagination={data?.meta ? {
          page: data.meta.page,
          pageSize: data.meta.page_size,
          total: data.meta.total,
          totalPages: data.meta.total_pages,
          onPageChange: setPage
        } : undefined}
        filters={
          <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-md">
            <div className="flex flex-col gap-2 min-w-[300px] flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">{tc('search')}</label>
              <div className="relative">
                <Input
                  placeholder={tb('search_placeholder')}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-surface-container-highest/30 border-none h-11 px-10 text-xs font-semibold"
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
