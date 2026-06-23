'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useKitchenRequestList, KitchenRequestSummary } from '@/features/operations/hooks/useKitchenRequests';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
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
import { audioAlerts } from '@/utils/audio';

import { isPendingStatus, isApprovedStatus, isCompletedStatus, type DocumentStatus } from '@logirest/shared-types';
import { KITCHEN_REQUEST_STATUS } from '@logirest/shared-types';

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

 const prevCount = useRef(data?.data?.length ?? 0);
 useEffect(() => {
  const currentCount = data?.data?.length ?? 0;
  if (prevCount.current > 0 && currentCount > prevCount.current) {
   audioAlerts.playScanSuccess();
  }
  prevCount.current = currentCount;
 }, [data?.data?.length]);

 const columns = useMemo<ColumnDef<KitchenRequestSummary>[]>(() => [
  {
   accessorKey: 'requestNumber',
   header: t('doc_number'),
   cell: ({ row }) => (
    <div className="flex flex-col min-w-0">
     <Link 
      href={`/kitchen-requests/${row.original.id}`}
      className="font-mono text-body-md font-semibold text-foreground hover:text-foreground transition-colors"
     >
      {row.original.requestNumber}
     </Link>
     <div className="flex items-center gap-1.5 opacity-20 mt-1">
      <Calendar className="w-2.5 h-2.5" />
      <ClientOnlyTime 
       date={row.original.createdAt} 
       mode="datetime" 
       locale={locale} 
       className="text-label-xxs font-semibold tabular-nums" 
      />
     </div>
    </div>
   ),
  },
  {
   accessorKey: 'departmentName',
   header: t('department'),
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <ChefHat className="w-3.5 h-3.5 text-muted-foreground/60" />
     <span className="font-bold text-label-sm text-foreground/80">
      {row.original.departmentName || '—'}
     </span>
    </div>
   ),
  },
  {
   accessorKey: 'warehouseName',
   header: t('warehouse'),
   cell: ({ row }) => (
    <div className="flex items-center gap-2">
     <Warehouse className="w-3.5 h-3.5 text-muted-foreground/60" />
     <span className="font-bold text-label-sm text-foreground/80">
      {row.original.warehouseName || '—'}
     </span>
    </div>
   ),
  },
  {
   accessorKey: 'requestedBy',
   header: t('requested_by'),
   cell: ({ row }) => (
    <span className="text-label-sm font-medium text-foreground/60">{row.original.requestedBy}</span>
   ),
  },
  {
   accessorKey: 'status',
   header: t('status'),
   cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
 ], [t, tc, locale]);

 const submittedCount = data?.data?.filter(doc => isPendingStatus('KITCHEN_REQUEST', doc.status as DocumentStatus)).length || 0;
 const approvedCount = data?.data?.filter(r => isApprovedStatus('KITCHEN_REQUEST', r.status)).length || 0;
 const completedCount = data?.data?.filter(doc => isCompletedStatus('KITCHEN_REQUEST', doc.status as DocumentStatus)).length || 0;
 const rejectedCount = data?.data?.filter(r => r.status === KITCHEN_REQUEST_STATUS.CANCELLED).length || 0;
 const fulfilledCount = data?.data?.filter(r => r.status === KITCHEN_REQUEST_STATUS.FULFILLED).length || 0;

 return (
  <div className="w-full min-w-0 gap-6 flex-1 flex-col flex">
   <Breadcrumb
    items={[
     { label: tc('home'), href: '/' },
     { label: tc('operations'), href: '/operations' },
     { label: t('title') },
    ]}
   />

   <PageHeader
    title={t('title')}
    subtitle={t('description')}
    children={
     <PermissionGate action="create" resource="kitchen_requests">
      <Button 
       onClick={() => router.push('/kitchen-requests/new')}
       variant="outline"
       className="w-full md:w-auto px-6 py-2.5 bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] font-bold rounded-lg shadow-sm hover:opacity-90 flex items-center justify-center gap-2 transition-opacity border-none"
      >
       <Plus className="w-4 h-4" />
       {t('create_new')}
      </Button>
     </PermissionGate>
    }
   />

   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <MetricCard
     label={t('statuses.submitted')}
     value={submittedCount}
     icon={<Clock className="w-4 h-4" />}
     color="cyan"
    />
    <MetricCard
     label={t('statuses.approved')}
     value={approvedCount}
     icon={<CheckCircle2 className="w-4 h-4" />}
     color="emerald"
    />
    <MetricCard
     label={t('statuses.rejected')}
     value={rejectedCount}
     icon={<AlertCircle className="w-4 h-4" />}
     color="rose"
    />
    <MetricCard
     label={t('statuses.fulfilled')}
     value={fulfilledCount}
     icon={<FileText className="w-4 h-4" />}
     color="indigo"
    />
   </div>

   <div className="flex-1 w-full min-h-[400px] md:min-h-0">
    <div className="hidden md:block w-full">
     <DataTable
      columns={columns}
      data={data?.data ?? []}
      isLoading={isLoading}
      pagination={{
       page: initialPage,
       pageSize: data?.meta?.pageSize ?? 10,
       total: data?.meta?.total ?? 0,
       totalPages: data?.meta?.totalPages ?? 1,
       onPageChange: (page) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', (page + 1).toString());
        router.push(`${pathname}?${params.toString()}`);
       }
      }}
     />
    </div>

    <div className="flex flex-col gap-3 md:hidden mt-4">
     {isLoading ? (
      <div className="flex items-center justify-center p-8">
       <span className="text-muted-foreground text-sm font-semibold animate-pulse">{tc('loading')}...</span>
      </div>
     ) : (!data?.data || data.data.length === 0) ? (
      <div className="p-8 text-center text-muted-foreground text-sm font-medium">{tc('datatable.no_records')}</div>
     ) : (
      data.data.map((item) => (
       <div key={item.id} className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
         <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
            <div><StatusBadge status={item.status} /></div>
            <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
             <ClientOnlyTime 
              date={item.createdAt} 
              mode="datetime" 
              locale={locale} 
              className="text-label-xxs font-semibold tabular-nums" 
             />
            </span>
         </div>
         
         <div className="flex justify-between items-center">
            <span className="text-sm font-black text-[#0B1220] dark:text-white" dir="ltr">{item.requestNumber}</span>
            <Link 
             href={`/kitchen-requests/${item.id}`}
             className="text-[#b48e67] hover:text-[#8a6b4c] text-xs font-bold flex items-center gap-1 transition-colors"
            >
              {locale === 'ar' ? 'عرض' : 'View'}
              <svg className="w-3 h-3 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
         </div>

         <div className="bg-gray-50 dark:bg-[#0B1220] p-2 rounded-lg border border-gray-100 dark:border-gray-800 flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[9px] text-gray-400 font-bold uppercase min-w-[50px]">{locale === 'ar' ? 'القسم' : 'DEPT'}</span>
              <span className="font-bold text-gray-700 dark:text-gray-300 truncate">{item.departmentName || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs border-t border-gray-100 dark:border-gray-800 pt-1.5">
              <span className="text-[9px] text-gray-400 font-bold uppercase min-w-[50px]">{locale === 'ar' ? 'المستودع' : 'WH'}</span>
              <span className="font-bold text-gray-700 dark:text-gray-300 truncate">{item.warehouseName || '—'}</span>
            </div>
         </div>
       </div>
      ))
     )}
    </div>
   </div>
  </div>
 );
}
