'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PrecisionTable } from '@/components/shared/PrecisionTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { MetricCard } from '@/components/ui/metric-card';
import { Button } from '@/components/ui/button';
import { 
 ArrowLeftRight, 
 Truck, 
 CheckCircle2, 
 Clock, 
 MapPin,
 ArrowRight,
 Eye,
 FileCheck,
 Plus
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { useTransferList, type TransferSummary } from '@/features/operations/hooks/useTransferList';

export function TransferHubClient() {
 const t = useTranslations('transfers');
 const tc = useTranslations('common');
 const locale = useLocale();
 const router = useRouter();
 
 const { data: transfersData, isLoading } = useTransferList();
 const transfers = transfersData?.data || [];

 const stats = useMemo(() => {
  const pending = transfers.filter(x => x.transferStatus === 'DRAFT' || x.transferStatus === 'PENDING').length;
  const transit = transfers.filter(x => x.transferStatus === 'IN_TRANSIT').length;
  const completed = transfers.filter(x => x.transferStatus === 'RECEIVED' || x.transferStatus === 'POSTED' || x.transferStatus === 'COMPLETED').length;
  
  return {
   pending,
   transit,
   completed,
   efficiency: completed > 0 ? Math.round((completed / Math.max(transfers.length, 1)) * 100) : 0
  };
 }, [transfers]);

 const columns: ColumnDef<TransferSummary, unknown>[] = [
  {
   accessorKey: 'documentNumber',
   header: t('doc_number'),
   cell: ({ row }) => <span className="font-mono text-label-xs font-bold text-primary">{row.original.documentNumber}</span>,
  },
  {
   id: 'route',
   header: t('route'),
   cell: ({ row }) => (
    <div className="flex items-center gap-3 text-sm font-medium">
     <span className="text-muted-foreground">{row.original.fromWarehouseName || '—'}</span>
     <ArrowRight className="w-3 h-3 opacity-30" />
     <span className="text-foreground">{row.original.toWarehouseName || '—'}</span>
    </div>
   ),
  },
  {
   accessorKey: 'createdAt',
   header: t('transfer_date'),
   cell: ({ row }) => <span className="tabular-nums opacity-70">{row.original.createdAt?.split('T')[0]}</span>,
  },
  {
    id: 'status',
    header: t('status'),
    cell: ({ row }) => {
     const s = row.original.transferStatus;
     const colors = {
      PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      IN_TRANSIT: 'bg-muted/50 text-foreground border-cyan-500/20',
      COMPLETED: 'bg-muted/50 text-foreground border-emerald-500/20'
     };
     const colorClass = colors[s as keyof typeof colors] || 'bg-muted/10 text-muted-foreground';
     return (
      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-sm border ${colorClass}`}>
       {tc(`statuses.${s?.toLowerCase()}` as 'statuses.pending')}
      </span>
     );
    },
  },
  {
   id: 'actions',
   header: '',
   cell: ({ row }) => (
    <div className="flex justify-end gap-2">
     <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 w-8 p-0 hover:bg-card/5"
      onClick={(e) => {
       e.stopPropagation();
       router.push(`/transfers/${row.original.id}`);
      }}
     >
      <Eye className="w-4 h-4 opacity-50" />
     </Button>
     {(row.original.transferStatus === 'DRAFT' || row.original.transferStatus === 'IN_TRANSIT') && (
      <Button 
       variant="ghost" 
       size="sm" 
       className="h-8 w-8 p-0 hover:bg-muted/50 hover:text-foreground"
       onClick={(e) => {
        e.stopPropagation();
        const target = row.original.transferStatus === 'DRAFT' ? 'ship' : 'receive';
        router.push(`/transfers/${row.original.id}/${target}`);
       }}
      >
       <FileCheck className="w-4 h-4" />
      </Button>
     )}
    </div>
   ),
  }
 ];

 return (
  <div className="min-w-0 max-w-[1600px] md:space-y-10 fade-in flex-1 gap-6 duration-1000 slide-in-from-bottom-4 mx-auto animate-in flex-col flex space-y-6 w-full">
   <PageHeader 
    title={t('title')} 
    subtitle={t('subtitle')}
    children={
     <Button 
      onClick={() => router.push('/transfers/new')}
      className="h-11 px-4 md:px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-label-xs font-bold uppercase rounded-sm transition-all shadow-sm shadow-primary/20"
     >
      <ArrowLeftRight className="w-3.5 h-3.5 me-2" />
      <span className="hidden sm:inline">{t('new_transfer')}</span>
      <span className="sm:hidden">{tc('add')}</span>
     </Button>
    }
   />

   {/* KPI Section */}
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
    <MetricCard
     label={t('pending_transfers')}
     value={stats.pending.toString()}
     icon={Clock}
     color="amber"
    />
    <MetricCard
     label={t('in_transit')}
     value={stats.transit.toString()}
     icon={Truck}
     color="cyan"
    />
    <MetricCard
     label={t('completed_today')}
     value={stats.completed.toString()}
     icon={CheckCircle2}
     color="emerald"
    />
    <MetricCard
     label={t('efficiency_rate')}
     value={`${stats.efficiency}%`}
     icon={MapPin}
     color="indigo"
    />
   </div>

    <div className="bg-card border border-border shadow-sm rounded-sm border border-white/5 shadow-2xl overflow-hidden hidden md:block">
     <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
      <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest">{t('registry.title')}</h3>
      <div className="flex gap-4 w-full sm:w-auto">
        <div className="h-2 flex-1 sm:w-32 bg-card/5 rounded-full overflow-hidden self-center">
         <div className="h-full bg-primary w-2/3" />
        </div>
      </div>
     </div>
     <PrecisionTable 
      data={transfers} 
      columns={columns}
      collectionName="internal_transfers"
     />
    </div>

    {/* Mobile View */}
    <div className="flex flex-col gap-3 md:hidden pb-10">
     <div className="flex justify-between items-center mb-2 px-1">
      <h3 className="text-label-xs font-bold uppercase text-muted-foreground/50 tracking-widest">{t('registry.title')}</h3>
     </div>
     {isLoading ? (
       <div className="flex items-center justify-center p-8">
         <span className="text-muted-foreground text-sm font-semibold animate-pulse">{tc('loading')}...</span>
       </div>
     ) : (transfers.length === 0) ? (
       <div className="p-8 text-center text-muted-foreground text-sm">{tc('no_records') || 'No records found'}</div>
     ) : (
       transfers.map((item) => {
         const s = item.transferStatus;
         const colors = {
          PENDING: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
          IN_TRANSIT: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/20',
          RECEIVED: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
          POSTED: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
          COMPLETED: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
          DRAFT: 'bg-amber-500/15 text-amber-500 border-amber-500/20'
         };
         const colorClass = colors[s as keyof typeof colors] || 'bg-muted/10 text-muted-foreground';
         
         return (
           <div key={item.id} className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl p-4 shadow-sm flex flex-col gap-3">
             {/* Top Row: Status badge and Date */}
             <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800/80 pb-2">
               <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${colorClass}`}>
                 {tc(`statuses.${s?.toLowerCase()}` as 'statuses.pending') || s}
               </span>
               <span className="text-[10px] text-gray-500 font-mono" dir="ltr">
                 {item.createdAt?.split('T')[0]}
               </span>
             </div>
             {/* Middle Row: Doc Number and View / Action Button */}
             <div className="flex justify-between items-center">
               <span className="text-sm font-black text-[#0B1220] dark:text-white font-mono" dir="ltr">
                 {item.documentNumber}
               </span>
               <div className="flex gap-2 items-center">
                 <button 
                   onClick={() => router.push(`/transfers/${item.id}`)} 
                   className="text-[#b48e67] hover:text-[#8a6b4c] text-xs font-bold flex items-center gap-1 transition-colors"
                 >
                   {tc('view') || 'View'} <ArrowRight className="w-3 h-3 ltr:rotate-0 rtl:rotate-180" />
                 </button>
                 {(item.transferStatus === 'DRAFT' || item.transferStatus === 'IN_TRANSIT') && (
                   <button 
                     onClick={() => {
                       const target = item.transferStatus === 'DRAFT' ? 'ship' : 'receive';
                       router.push(`/transfers/${item.id}/${target}`);
                     }}
                     className="text-[#b48e67] hover:text-[#8a6b4c] text-xs font-bold flex items-center gap-1 transition-colors border-s border-gray-100 dark:border-gray-850 ps-2"
                   >
                     {item.transferStatus === 'DRAFT' ? tc('ship') || 'Ship' : tc('receive') || 'Receive'}
                   </button>
                 )}
               </div>
             </div>
             {/* Bottom Details Section (Nested card) */}
             <div className="bg-gray-50 dark:bg-[#0A0E1A] p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/50 flex flex-col gap-1.5 mt-1">
               <div className="flex justify-between items-center text-xs">
                 <span className="text-[10px] text-gray-400 font-medium">{t('source_warehouse')}</span>
                 <span className="font-semibold text-gray-700 dark:text-gray-300">
                   {item.fromWarehouseName || '—'}
                 </span>
               </div>
               <div className="flex justify-between items-center text-xs border-t border-gray-100 dark:border-gray-800/50 pt-1.5">
                 <span className="text-[10px] text-gray-400 font-medium">{t('target_warehouse')}</span>
                 <span className="font-semibold text-gray-700 dark:text-gray-300">
                   {item.toWarehouseName || '—'}
                 </span>
               </div>
             </div>
           </div>
         );
       })
     )}
    </div>
  </div>
 );
}
