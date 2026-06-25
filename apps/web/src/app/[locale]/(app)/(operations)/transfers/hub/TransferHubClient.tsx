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

   <div className="bg-card border border-border shadow-sm rounded-sm border border-white/5 shadow-2xl overflow-hidden">
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
  </div>
 );
}
