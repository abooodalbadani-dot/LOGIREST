'use client';

import { useState, useMemo } from 'react';
<<<<<<< HEAD:src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
=======
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
import { Plus, Layers, Search, FolderTree, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ColumnDef } from '@tanstack/react-table';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { type Category } from '@/types/master-data';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function CategoryListClient({ locale }: { locale: string }) {
<<<<<<< HEAD:src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 const t = useTranslations('common');
 const tc = useTranslations('master_data.categories');
 const router = useRouter();
 const [search, setSearch] = useState('');
=======
  const t = useTranslations('common');
  const tc = useTranslations('master_data.categories');
  const router = useRouter();
  const [search, setSearch] = useState('');
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx

  const { data, isLoading, isError, refetch } = useCategories({ search });

  if (isLoading && !data) {
    return <PageSkeleton variant="list" />;
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState 
          type="server_error"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

 const columns = useMemo<ColumnDef<Category, unknown>[]>(() => [
 {
 accessorKey: 'name_en',
 header: t('name'),
 cell: ({ row }) => (
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-sm bg-cyan-500/10 flex items-center justify-center shrink-0">
 <Layers className="w-3.5 h-3.5 text-cyan-500" />
 </div>
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-label-sm">{row.original.name_en}</span>
 <span className="text-label-xs text-muted-foreground/50" dir="rtl">{row.original.name_ar}</span>
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
 className="text-label-xs font-semibold uppercase text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10 h-7"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/${locale}/master-data/categories/${row.original.id}`);
 }}
 >
 {t('view')}
 </Button>
 </PermissionGate>
 </div>
 ),
 },
 ], [t, router, locale]);

 const breadcrumbs = [
<<<<<<< HEAD:src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 { label: t('home'), href: `/${locale}/dashboard` },
 { label: t('master_data'), href: `/${locale}/master-data` },
 { label: tc('title'), href: `/${locale}/master-data/categories` },
=======
 { label: t('home'), href: `/dashboard` },
 { label: t('master_data'), href: `/master-data` },
 { label: tc('title'), href: `/master-data/categories` },
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 ];

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="space-y-4">
 <Breadcrumb items={breadcrumbs} />
 <PageHeader 
 title={tc('title')} 
 description={tc('description')}
 actions={
 <PermissionGate action="create" resource="master_data">
<<<<<<< HEAD:src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 <Link href={`/${locale}/master-data/categories/new`}>
 <Button className="h-11 px-8 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-cyan-900/20">
=======
 <Link href={`/master-data/categories/new`}>
 <Button className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-primary/20">
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 <Plus className="w-3.5 h-3.5 me-2" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={tc('metrics.total_categories')}
 value={data?.meta?.total || 0}
 icon={Layers}
 color="cyan"
 />

 <MetricCard
 label={tc('metrics.hierarchy_status')}
 value={tc('metrics.flat')}
 icon={FolderTree}
 color="amber"
 />

 <MetricCard
 label={tc('metrics.mapping_status')}
 value={tc('metrics.optimal')}
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
 title={tc('empty.title')}
 description={tc('empty.description')}
 action={
 <PermissionGate action="create" resource="master_data">
<<<<<<< HEAD:src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 <Link href={`/${locale}/master-data/categories/new`}>
 <Button className="h-10 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg">
=======
 <Link href={`/master-data/categories/new`}>
 <Button className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg">
>>>>>>> 002-frontend-baseline:apps/web/src/app/[locale]/(app)/master-data/categories/CategoryListClient.tsx
 <Plus className="w-3.5 h-3.5 me-2" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 }
 onRowClick={(r: Category) => router.push(`/${locale}/master-data/categories/${r.id}`)}
 filters={
 <div className="flex flex-wrap items-end gap-6 w-full py-4 px-6 bg-surface-container-low/50 border border-surface-variant/10 rounded-sm">
 <div className="flex flex-col gap-2 min-w-[300px] flex-1">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('search')}</label>
 <div className="relative">
 <Input
 placeholder={tc('search_placeholder')}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-surface-container-highest/30 border-none h-11 ps-10 text-label-sm font-bold"
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

