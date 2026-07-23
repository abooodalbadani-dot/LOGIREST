'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { Pagination } from '@/components/shared/DataTable/Pagination';
import { useEmailOutbox, type EmailOutboxRow } from '@/features/notifications/hooks/useEmailOutbox';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { PageHeader } from '@/components/shared/PageHeader';
import { Mail, RefreshCcw, Send, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColumnDef } from '@tanstack/react-table';
import { LucideIcon } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

const statusConfig: Record<string, { color: string, icon: LucideIcon }> = {
 PENDING: { color: 'text-amber-400', icon: Clock },
 SENT: { color: 'text-foreground', icon: Send },
 FAILED: { color: 'text-rose-400', icon: AlertCircle },
};

export function EmailOutboxClient() {
 const t = useTranslations('notifications');
 const tc = useTranslations('common');
 const [page, setPage] = useState(1);
 const [statusFilter, setStatusFilter] = useState('');
 const { data, isLoading } = useEmailOutbox({ status: statusFilter || undefined, page });
 
 const queryClient = useQueryClient();
 const { playSound } = useAudioFeedback();
 const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});

 const handleRetry = async (id: string) => {
  setRetryingIds(prev => ({ ...prev, [id]: true }));
  try {
   await apiClient.post(`/notifications/outbox/${id}/retry`, z.unknown(), {});
   playSound('success');
   toast.success(t('retry_success') || 'Requeued for transmission.');
   queryClient.invalidateQueries({ queryKey: ['notifications/outbox'] });
  } catch (err: unknown) {
   playSound('error');
   const msg = err instanceof Error ? err.message : String(err);
   toast.error(msg || 'Failed to retry email transmission.');
  } finally {
   setRetryingIds(prev => ({ ...prev, [id]: false }));
  }
 };

 const columns: ColumnDef<EmailOutboxRow>[] = [
  {
   accessorKey: 'recipientEmail',
   header: t('recipient'),
   cell: ({ row }) => (
    <div className="flex flex-col gap-0.5 min-w-0 max-w-[200px] lg:max-w-[300px]">
     <span dir="ltr" className="font-bold text-label-sm truncate">{row.original.recipientEmail}</span>
     <span className="text-label-xs opacity-40 uppercase">{t('verified_recipient')}</span>
    </div>
   ),
  },
  {
   accessorKey: 'subject',
   header: tc('subject'),
   cell: ({ row }) => <span className="text-body-md font-medium line-clamp-1 opacity-80">{row.original.subject}</span>,
  },
  {
   accessorKey: 'status',
   header: tc('status_label'),
   cell: ({ row }) => {
    const config = statusConfig[row.original.status] || { color: 'text-muted-foreground', icon: Clock };
    const Icon = config.icon;
    return (
     <div className={`flex items-center gap-2 ${config.color} font-semibold text-label-xs uppercase`}>
      <Icon className="w-3 h-3" />
      {row.original.status}
     </div>
    );
   },
  },
  {
   accessorKey: 'sentAt',
   header: t('sent_at'),
   cell: ({ row }) => row.original.sentAt
    ? (
     <ClientOnlyTime 
      date={row.original.sentAt} 
      mode="datetime" 
      className="text-label-xs opacity-40 font-mono italic"
     />
    )
    : <span className="opacity-20">—</span>,
  },
  {
   accessorKey: 'retry',
   header: '',
   cell: ({ row }) => row.original.status === 'FAILED'
    ? (
     <div className="flex justify-end">
      <button
       className="flex items-center gap-2 px-4 py-1.5 text-label-xxs font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-sm hover:bg-amber-500/20 transition-all disabled:opacity-50"
       disabled={retryingIds[row.original.id]}
       onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        handleRetry(row.original.id);
       }}
      >
       <RefreshCcw className={`w-3 h-3 ${retryingIds[row.original.id] ? 'animate-spin' : ''}`} />
       {t('retry')}
      </button>
     </div>
    )
    : null,
  },
 ];

 const totalSent = data?.meta?.total || 0;
 const delivered = data?.data?.filter(e => e.status === 'SENT').length || 0;
 const failed = data?.data?.filter(e => e.status === 'FAILED').length || 0;

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex space-y-10 w-full">
   <PageHeader 
    title={t('email_outbox_title')} 
    subtitle={t('email_outbox_desc')}
    children={
     <div className="flex items-center gap-4">
      <div className="flex flex-col items-end gap-1 px-4 border-e border-white/10 min-w-0">
       <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">{t('filter_by_status')}</span>
       <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v === 'all' ? '' : v); setPage(1); } }}>
        <SelectTrigger className="w-[180px] h-9 bg-card border border-border shadow-sm border-white/5 text-label-xs font-bold uppercase">
         <SelectValue placeholder={t('all_statuses')} />
        </SelectTrigger>
        <SelectContent className="bg-card border border-border shadow-sm border-white/10">
         <SelectItem value="all" className="text-label-sm font-bold uppercase">{t('all_statuses')}</SelectItem>
         <SelectItem value="PENDING" className="text-label-sm font-bold uppercase">{t('pending')}</SelectItem>
         <SelectItem value="SENT" className="text-label-sm font-bold uppercase text-foreground">{t('sent')}</SelectItem>
         <SelectItem value="FAILED" className="text-label-sm font-bold uppercase text-rose-400">{t('failed')}</SelectItem>
        </SelectContent>
       </Select>
      </div>
     </div>
    }
   />

   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <MetricCard
     label={t('stats.total_sent')}
     value={totalSent}
     icon={Mail}
     color="cyan"
    />
    <MetricCard
     label={t('stats.delivered')}
     value={delivered}
     icon={CheckCircle2}
     color="emerald"
    />
    <MetricCard
     label={t('stats.failed')}
     value={failed}
     icon={AlertCircle}
     color="rose"
    />
   </div>

   <div className="hidden md:block w-full">
    <DataTable
     columns={columns}
     data={data?.data ?? []}
     isLoading={isLoading}
     collectionName="communications_email_outbox"
     pagination={data?.meta ? {
      page,
      pageSize: 10,
      total: data.meta.total,
      totalPages: data.meta.totalPages,
      onPageChange: setPage
     } : undefined}
    />
   </div>

   {!isLoading && data?.data && data.data.length > 0 && (
    <div className="flex flex-col gap-3 md:hidden mt-4">
     {data.data.map((entry) => {
      const config = statusConfig[entry.status] || { color: 'text-muted-foreground', icon: Clock };
      const Icon = config.icon;
      return (
       <div key={entry.id} className="flex flex-col gap-2 p-4 bg-card dark:bg-card border border-border dark:border-gray-800 shadow-sm rounded-lg">
        <div className="flex justify-between items-center">
         <div className={`flex items-center gap-2 ${config.color} font-semibold text-label-xs uppercase`}>
          <Icon className="w-3 h-3" />
          {entry.status}
         </div>
         <div className="text-xs text-gray-500">
          {entry.sentAt ? <ClientOnlyTime date={entry.sentAt} mode="datetime" /> : '—'}
         </div>
        </div>
        <div className="text-sm font-bold text-foreground dark:text-white line-clamp-2">
         {entry.subject}
        </div>
        <div className="text-xs text-muted-foreground dark:text-gray-400 break-all line-clamp-2">
         {entry.recipientEmail}
        </div>
        {entry.status === 'FAILED' && (
         <div className="flex justify-end mt-2">
          <button
           className="flex items-center gap-2 px-4 py-1.5 text-label-xxs font-semibold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-sm hover:bg-amber-500/20 transition-all disabled:opacity-50"
           disabled={retryingIds[entry.id]}
           onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleRetry(entry.id);
           }}
          >
           <RefreshCcw className={`w-3 h-3 ${retryingIds[entry.id] ? 'animate-spin' : ''}`} />
           {t('retry')}
          </button>
         </div>
        )}
       </div>
      );
     })}

     {data?.meta && data.meta.totalPages > 1 && (
      <div className="flex justify-center mt-4 pb-8">
       <Pagination 
        page={page} 
        totalPages={data.meta.totalPages} 
        onPageChange={setPage} 
       />
      </div>
     )}
    </div>
   )}
  </div>
 );
}
