'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Layers, Search, FolderTree, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ColumnDef } from '@tanstack/react-table';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { CategorySchema, type Category } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';

export function CategoryListClient({ locale }: { locale: string }) {
  const tc = useTranslations('masterData.common');
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useMasterDataList(
    'categories', 
    CategorySchema, 
    { page: String(page), ...(search ? { search } : {}) }
  );

  const columns = useMemo<ColumnDef<Category, unknown>[]>(() => [
    {
      accessorKey: 'name_en',
      header: tc('name'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm bg-cyan-500/10 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs tracking-tight">{row.original.name_en}</span>
            <span className="text-[10px] text-muted-foreground/50" dir="rtl">{row.original.name_ar}</span>
          </div>
        </div>
      ),
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
                router.push(`/${locale}/master-data/categories/${row.original.id}`);
              }}
            >
              {tc('view')}
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ], [tc, router, locale]);

  const breadcrumbs = [
    { label: tc('home'), href: `/${locale}/dashboard` },
    { label: tc('master_data'), href: `/${locale}/master-data` },
    { label: tc('categories'), href: `/${locale}/master-data/categories` },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageHeader 
          title={tc('categories') || 'Item Categories'} 
          description={tc('categories_desc') || "Logical grouping of inventory assets for hierarchical control and reporting"}
          actions={
            <PermissionGate action="create" resource="master_data">
              <Link href={`/${locale}/master-data/categories/new`}>
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
          label={tc('total_categories') || 'Total Groups'}
          value={data?.meta?.total || 0}
          icon={Layers}
          color="cyan"
        />

        <MetricCard
          label={tc('hierarchy_status') || 'Hierarchy Depth'}
          value={tc('flat') || 'Flat'}
          icon={FolderTree}
          color="amber"
        />

        <MetricCard
          label={tc('mapping_status') || 'Mapping Status'}
          value={tc('optimal') || 'Optimal'}
          icon={Info}
          color="emerald"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data?.data ?? []} 
        isLoading={isLoading}
        collectionName="master_data_categories"
        emptyState={
          <EmptyState 
            title={tc('no_categories_title') || 'No Categories Found'}
            description={tc('no_categories_desc') || 'Group your items into logical categories for better organization.'}
            action={
              <PermissionGate action="create" resource="master_data">
                <Link href={`/${locale}/master-data/categories/new`}>
                  <Button className="h-10 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-all shadow-lg">
                    <Plus className="w-3.5 h-3.5 me-2" />
                    {tc('create_new')}
                  </Button>
                </Link>
              </PermissionGate>
            }
          />
        }
        onRowClick={(r: Category) => router.push(`/${locale}/master-data/categories/${r.id}`)}
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
                  placeholder={tc('search_categories_placeholder') || "Filter categories by name..."}
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
