'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { usePOList, POSummary } from '@/features/purchasing/hooks/usePOList';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Plus, Filter, ClipboardList, CheckCircle2, Clock, ArrowUpRight, ListFilter, Search, Truck } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/shared/EmptyState';

export function POListClient({ locale }: { locale: 'ar' | 'en' }) {
 const t = useTranslations('procurement.po');
 const tc = useTranslations('common');
 const router = useRouter();

 const [page, setPage] = useState(1);
 const [status, setStatus] = useState<string>('');
 const [supplier_id, setSupplierId] = useState<string>('');

 const { data, isLoading } = usePOList({ status, supplier_id, page });

 const columns = useMemo<ColumnDef<POSummary, unknown>[]>(() => [
 {
 accessorKey: 'status',
 header: tc('status_label'),
 cell: ({ row }) => <StatusBadge status={row.original.status as BadgeStatus} />,
 },
 {
 accessorKey: 'document_number',
 header: tc('doc_number'),
 cell: ({ row }) => (
 <span dir="ltr" className="font-mono text-amber-500 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
 {row.original.document_number}
 </span>
 ),
 },
 {
 accessorKey: 'supplier_id',
 header: t('supplier'),
 cell: ({ row }) => (
 <div className="flex flex-col text-start">
 <span className="opacity-90 font-bold text-body-md">{row.original.supplier_id}</span>
 <span className="text-label-xxs uppercase text-muted-foreground/60 font-semibold">{t('supplier')}</span>
 </div>
 ),
 },
 {
 accessorKey: 'expected_date',
 header: t('expected_date'),
 cell: ({ row }) => (
 <div className="flex flex-col text-start">
 <span dir="ltr" className="text-label-xs font-mono font-semibold text-foreground/80">
 {format(new Date(row.original.expected_date), 'dd/MM/yyyy')}
 </span>
 <span className="text-label-xxs uppercase opacity-30 font-semibold">{t('expected_date')}</span>
 </div>
 ),
 },
 {
 accessorKey: 'supplier_total_amount',
 header: t('total_amount'),
 cell: ({ row }) => (
 <div className="flex flex-col text-end">
 <span dir="ltr" className="text-body-md font-mono font-semibold text-foreground/90">
 {new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(row.original.supplier_total_amount)} {row.original.currency_code}
 </span>
 <span className="text-label-xxs uppercase text-muted-foreground/60 font-semibold">{t('total_amount')}</span>
 </div>
 ),
 },
 {
 id: 'actions',
 header: '',
 cell: ({ row }) => (
 <div className="flex justify-end">
 <PermissionGate action="view" resource="po">
 <Button 
 variant="ghost" 
 size="icon" 
 className="w-8 h-8 rounded-xl bg-surface-variant/10 hover:bg-amber-500/20 text-muted-foreground/60 hover:text-amber-500 transition-all group"
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/ ${locale}/purchase-orders/ ${row.original.id}`);
 }}
 >
 <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100" />
 </Button>
 </PermissionGate>
 </div>
 ),
 },
 ], [t, tc, locale, router]);

 const breadcrumbs = [
 { label: tc('sidebar.dashboard'), href: `/ ${locale}/dashboard` },
 { label: t('title'), href: `/ ${locale}/purchase-orders` },
 ];

 const totalPOs = data?.meta?.total || 0;
 const approvedCount = data?.data?.filter(p => p.status === 'APPROVED').length || 0;
 const pendingCount = data?.data?.filter(p => p.status === 'DRAFT' || p.status === 'SUBMITTED').length || 0;

 return (
 <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
 <div className="space-y-4">
 <Breadcrumb items={breadcrumbs} />
 <PageHeader 
 title={t('title')} 
 description={t('description')}
 actions={
 <PermissionGate action="create" resource="po">
 <Link href={`/ ${locale}/purchase-orders/new`}>
 <Button className="h-12 px-8 bg-amber-600 hover:bg-amber-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg shadow-amber-900/20">
 <Plus className="w-4 h-4 me-2" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <MetricCard
 label={t('metrics.total')}
 value={totalPOs}
 icon={ClipboardList}
 color="amber"
 />
 <MetricCard
 label={t('metrics.approved')}
 value={approvedCount}
 icon={CheckCircle2}
 color="emerald"
 />
 <MetricCard
 label={t('metrics.pending')}
 value={pendingCount}
 icon={Clock}
 color="cyan"
 />
 </div>

 <div className="bg-surface-container-low rounded-sm overflow-hidden border border-surface-variant/10 shadow-2xl shadow-primary/5">
 <DataTable 
 columns={columns}
 data={data?.data || []}
 isLoading={isLoading}
 onRowClick={(row: POSummary) => router.push(`/ ${locale}/purchase-orders/ ${row.id}`)}
 collectionName="procurement_po"
 emptyState={
 <EmptyState 
 title={t('no_orders_title')}
 description={t('no_orders_desc')}
 icon={Truck}
 action={
 <PermissionGate action="create" resource="po">
 <Link href={`/ ${locale}/purchase-orders/new`}>
 <Button className="h-10 px-6 bg-amber-600 hover:bg-amber-500 text-white text-label-xs font-semibold uppercase rounded-sm transition-all shadow-lg">
 <Plus className="w-3.5 h-3.5 me-2" />
 {t('create_new')}
 </Button>
 </Link>
 </PermissionGate>
 }
 />
 }
 pagination={data?.meta ? {
 page: page,
 pageSize: 10,
 total: data.meta.total,
 totalPages: data.meta.total_pages,
 onPageChange: setPage
 } : undefined}
 filters={
 <div className="flex flex-wrap items-center gap-6 w-full py-6 px-8 border-b border-surface-variant/10">
 <div className="flex flex-col gap-2 min-w-[200px]">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('status_filtering')}</label>
 <Select
 value={status || 'ALL'} onValueChange={(val) => { setStatus(val === 'ALL' ? '' : (val ?? '')); setPage(1); }}
 >
 <SelectTrigger className="w-full bg-surface-variant/10 border-none h-11 px-5 text-label-xs font-bold rounded-sm shadow-inner shadow-black/5">
 <div className="flex items-center gap-2">
 <ListFilter className="w-3.5 h-3.5 text-muted-foreground/60" />
 <SelectValue placeholder={tc('status.all')} />
 </div>
 </SelectTrigger>
 <SelectContent className="bg-surface-container-highest border border-surface-variant/10 shadow-2xl rounded-sm">
 <SelectItem value="ALL" className="text-label-xs font-bold">{tc('status.all')}</SelectItem>
 <SelectItem value="DRAFT" className="text-label-xs font-bold">{tc('status.draft')}</SelectItem>
 <SelectItem value="SUBMITTED" className="text-label-xs font-bold">{tc('status.submitted')}</SelectItem>
 <SelectItem value="APPROVED" className="text-label-xs font-bold">{tc('status.approved')}</SelectItem>
 <SelectItem value="REJECTED" className="text-label-xs font-bold">{tc('status.rejected')}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
 <label className="text-label-xxs font-semibold uppercase text-muted-foreground/60 ps-1">{tc('search')}</label>
 <div className="relative group">
 <Input
 placeholder={t('search_placeholder')}
 className="w-full bg-surface-variant/10 border-none h-11 px-11 text-label-xs font-bold rounded-sm shadow-inner shadow-black/5 transition-all focus:bg-surface-container-high"
 />
 <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-amber-500 transition-colors" />
 </div>
 </div>

 <Button variant="ghost" className="h-11 px-6 text-muted-foreground/60 hover:text-amber-500 text-label-xxs font-semibold uppercase border border-dashed border-surface-variant/10 rounded-sm hover:bg-amber-500/5 hover:border-amber-500/20 transition-all mt-6">
 <Filter className="w-3.5 h-3.5 me-2" />
 {tc('filters_button')}
 </Button>
 </div>
 }
 />
 </div>
 </div>
 );
}
