'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useKitchenRequestList, KitchenRequestSummary } from '@/features/operations/hooks/useKitchenRequests';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { MetricCard } from '@/components/ui/metric-card';
import { ColumnDef } from '@tanstack/react-table';
import { 
 FileText, 
 Plus, 
 Warehouse, 
 Calendar, 
 ChefHat,
 Clock,
 CheckCircle2,
 AlertCircle
} from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export function KitchenRequestsListClient({
 initialStatus,
 initialDepartmentId,
 initialPage,
 locale
}: {
 initialStatus?: string;
 initialDepartmentId?: string;
 initialPage: number;
 locale: 'ar' | 'en'
}) {
 const t = useTranslations('operations.kitchen_request');
 const tc = useTranslations('common');
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 const { data, isLoading } = useKitchenRequestList({
 status: initialStatus,
 department_id: initialDepartmentId,
 page: initialPage
 });

 const columns = useMemo<ColumnDef<KitchenRequestSummary>[]>(() => [
 {
 accessorKey: 'request_number',
 header: t('doc_number'),
 cell: ({ row }) => (
 <div className="flex flex-col">
 <Link 
 href={`/kitchen-requests/${row.original.id}`}
 className="font-mono text-body-md font-semibold text-cyan-500 hover:text-cyan-400 transition-colors"
 >
 {row.original.request_number}
 </Link>
 <div className="flex items-center gap-1.5 opacity-20 mt-1">
 <Calendar className="w-2.5 h-2.5" />
 <span dir="ltr" className="text-label-xxs font-semibold tabular-nums">
 {format(new Date(row.original.created_at), 'MMM dd, HH:mm')}
 </span>
 </div>
 </div>
 ),
 },
 {
 accessorKey: 'department_id',
 header: t('department'),
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <ChefHat className="w-3.5 h-3.5 text-muted-foreground/60" />
 <span className="font-bold text-label-sm text-foreground/80">{row.original.department_id}</span>
 </div>
 ),
 },
 {
 accessorKey: 'warehouse_id',
 header: t('warehouse'),
 cell: ({ row }) => (
 <div className="flex items-center gap-2">
 <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60" />
 <span className="font-bold text-label-sm text-foreground/80">{row.original.warehouse_id}</span>
 </div>
 ),
 },
 {
 accessorKey: 'requested_by',
 header: t('requested_by'),
 cell: ({ row }) => (
 <span className="text-label-sm font-medium text-foreground/60">{row.original.requested_by}</span>
 ),
 },
 {
 accessorKey: 'status',
 header: t('status'),
 cell: ({ row }) => <StatusBadge status={row.original.status} />,
 },
 ], [t, tc]);

 return (
 <div className="flex flex-col gap-6 p-6">
 <Breadcrumb
 items={[
 { label: tc('home'), href: '/' },
 { label: tc('operations'), href: '/operations' },
 { label: t('title') },
 ]}
 />

 <PageHeader
 title={t('title')}
 description={t('description')}
 actions={
 <PermissionGate action="create" resource="kitchen_requests">
 <Button 
 onClick={() => router.push('/kitchen-requests/new')}
 className="bg-cyan-600 hover:bg-cyan-500 text-white border-none shadow-[0_0_15px_rgba(8,145,178,0.3)] transition-all active:scale-95"
 >
 <Plus className="w-4 h-4 mr-2" />
 {t('create_new')}
 </Button>
 </PermissionGate>
 }
 />

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <MetricCard
 label={t('statuses.submitted')}
 value={data?.meta?.total ?? 0}
 icon={<Clock className="w-4 h-4" />}
 color="cyan"
 />
 <MetricCard
 label={t('statuses.approved')}
 value={0}
 icon={<CheckCircle2 className="w-4 h-4" />}
 color="emerald"
 />
 <MetricCard
 label={t('statuses.rejected')}
 value={0}
 icon={<AlertCircle className="w-4 h-4" />}
 color="rose"
 />
 <MetricCard
 label={t('statuses.fulfilled')}
 value={0}
 icon={<FileText className="w-4 h-4" />}
 color="indigo"
 />
 </div>

 <div className="bg-surface-container-low rounded-xl border border-outline-low shadow-sm">
 <DataTable
 columns={columns}
 data={data?.data ?? []}
 isLoading={isLoading}
 pagination={{
 page: initialPage,
 pageSize: data?.meta?.page_size ?? 10,
 total: data?.meta?.total ?? 0,
 totalPages: data?.meta?.total_pages ?? 1,
 onPageChange: (page) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set('page', (page + 1).toString());
 router.push(`${pathname}?${params.toString()}`);
 }
 }}
 />
 </div>
 </div>
 );
}
