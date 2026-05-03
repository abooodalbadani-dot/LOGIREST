'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { Plus, Users, CheckCircle2, ExternalLink, CreditCard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { type Supplier } from '@/types/master-data';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';

export function SupplierListClient({ locale }: { locale: string }) {
 const t = useTranslations('common');
 const tc = useTranslations('master_data.suppliers');
 const router = useRouter();
 const [search, setSearch] = useState('');

 const { data, isLoading } = useSuppliers({ search });

 const stats = useMemo(() => {
 const suppliers = data?.data || [];
 return {
 total: data?.meta?.total || 0,
 active: suppliers.filter(s => s.is_active).length,
 };
 }, [data]);

 const columns = useMemo<ColumnDef<Supplier, unknown>[]>(() => [
 {
 accessorKey: 'code',
 header: t('code'),
 cell: ({ row }) => (
 <span className="font-mono text-label-xs font-semibold text-status-active uppercase px-2 py-0.5 bg-status-active/5 rounded-sm border border-status-active/10" dir="ltr">
 {row.original.code}
 </span>
 ),
 },
 {
 accessorKey: 'name',
 header: t('name_en'),
 cell: ({ row }) => (
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-label-sm">{row.original.name_en}</span>
 <span className="text-label-xs opacity-40 font-medium" dir="rtl">{row.original.name_ar}</span>
 </div>
 ),
 },
 {
 accessorKey: 'payment_terms',
 header: tc('fields.payment_terms'),
 cell: ({ row }) => row.original.payment_terms
 ? (
 <div className="flex items-center gap-1.5 text-warning font-bold text-label-xs uppercase">
 <CreditCard className="w-3 h-3 opacity-60" />
 {row.original.payment_terms}
 </div>
 )
 : <span className="opacity-20 italic text-label-xs">{t('not_available')}</span>,
 },
 {
 accessorKey: 'is_active',
 header: t('status'),
 cell: ({ row }) => (
 <StatusBadge status={row.original.is_active ? 'ACTIVE' : 'INACTIVE'} />
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
 className="text-label-xs font-semibold uppercase text-primary hover:text-primary-foreground hover:bg-primary h-7"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/master-data/suppliers/${row.original.id}`);
 }}
 >
 {t('view')}
 </Button>
 </PermissionGate>
 </div>
 ),
 },
 ], [t, tc, router]);

 const breadcrumbs = [
 { label: t('home'), href: `/dashboard` },
 { label: t('master_data'), href: `/master-data` },
 { label: tc('title'), href: `/master-data/suppliers` },
 ];

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <Breadcrumb items={breadcrumbs} />

 <PageHeader
 title={tc('title')}
 description={tc('description')}
 actions={
 <PermissionGate action="create" resource="master_data">
 <Link href={`/master-data/suppliers/new`}>
 <Button className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-primary/20">
 <Plus className="w-3.5 h-3.5 me-2" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={t('total')}
 value={stats.total}
 icon={Users}
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
 label={tc('metrics.compliance')}
 value="100%"
 icon={ExternalLink}
 color="rose"
 dir="ltr"
 />
 </div>

 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 collectionName="master_data_suppliers"
 onRowClick={(r: Supplier) => router.push(`/master-data/suppliers/${r.id}`)}
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

