'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useStocktakeVarianceReport, StocktakeVarianceReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatQuantity } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useStocktakeList } from '@/features/operations/hooks/useStocktakeList';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';

export default function StocktakeVarianceClient() {
 const t = useTranslations('reports');
 const locale = useLocale() as 'ar' | 'en';
 
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const sessionId = searchParams.get('sessionId');

 const { data: sessionListData } = useStocktakeList({ page: 1 });
 const sessions = sessionListData?.data || [];
 
 const activeSessionId = sessionId || (sessions.length > 0 ? sessions[0].id : '');

 const { data, isLoading } = useStocktakeVarianceReport(activeSessionId);

 const handleSessionChange = (id: string | null) => {
  if (!id) return;
  const params = new URLSearchParams(Array.from(searchParams.entries()));
  params.set('sessionId', id);
  router.push(`${pathname}?${params.toString()}`);
 };

 const columns: ColumnDef<StocktakeVarianceReport>[] = [
  {
   accessorKey: 'sku',
   header: t('table.sku'),
  },
  {
   accessorKey: 'name',
   header: t('table.name'),
  },
  {
   accessorKey: 'systemQty',
   header: t('table.system_qty'),
   meta: { numeric: true },
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono">
     {formatQuantity(row.original.systemQty, locale)}
    </span>
   ),
  },
  {
   accessorKey: 'countedQty',
   header: t('table.counted_qty'),
   meta: { numeric: true },
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono">
     {formatQuantity(row.original.countedQty, locale)}
    </span>
   ),
  },
  {
   accessorKey: 'variance',
   header: t('table.variance'),
   meta: { numeric: true },
   cell: ({ row }) => {
    const val = row.getValue('variance') as number;
    return (
     <span 
      dir="ltr" 
      className={cn(
       "font-mono",
       val < 0 ? 'text-destructive font-bold' : val > 0 ? 'text-operational-cyan font-bold' : ''
      )}
     >
      {val > 0 ? `+${formatQuantity(val, locale)}` : formatQuantity(val, locale)}
     </span>
    );
   }
  },
  {
   accessorKey: 'reason',
   header: t('table.reason'),
  },
 ];

 const exportColumns = [
  { header: t('table.sku'), key: 'sku', width: 12 },
  { header: t('table.item'), key: 'name', width: 30 },
  { header: t('table.system_qty'), key: 'systemQty', width: 11 },
  { header: t('table.counted_qty'), key: 'countedQty', width: 11 },
  { header: t('table.variance'), key: 'variance', width: 11 },
  { header: t('table.reason'), key: 'reason', width: 25 },
 ];

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
   <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
     <PageHeader 
      title={t('stocktake_variance')}
      subtitle={t('stocktake_variance_desc')}
      backHref="/reports"
     />
     {sessions.length > 0 && (
      <div className="flex items-center gap-3 bg-card border border-border shadow-sm px-4 py-2.5 rounded-2xl">
       <span className="text-label-xs font-semibold text-muted-foreground uppercase">
        {t('table.session_number') || 'Session:'}
       </span>
       <Select value={activeSessionId} onValueChange={handleSessionChange}>
        <SelectTrigger className="w-56 bg-surface-container-high border-none rounded-xl text-label-xs text-muted-foreground">
         <SelectValue placeholder={t('select_session')}>
          {activeSession ? activeSession.sessionNumber : activeSessionId ? '...' : t('select_session')}
         </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card border border-border shadow-sm border-none rounded-xl shadow-2xl">
         {sessions.map((s) => (
          <SelectItem key={s.id} value={s.id} className="text-label-xs font-semibold">
           {s.sessionNumber} ({s.status})
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>
     )}
    </div>

    {/* Desktop View Table */}
    <div className="hidden md:block">
     <DataTable
      data={data || []}
      columns={columns}
      isLoading={isLoading}
      exportComponent={
       activeSessionId ? (
        <ReportExportMenu 
         columns={exportColumns}
         data={data || []}
         filename="Stocktake_Variance_Report"
         title={t('stocktake_variance')}
         exportRoute={`/reports/stocktake-variance/export?sessionId=${activeSessionId}`}
         countCheckParams={{ type: 'stocktake-variance', sessionId: activeSessionId }}
        />
       ) : undefined
      }
      collectionName="reports"
      enableVirtualization={true}
      containerHeight="600px"
     />
    </div>

    {/* Mobile Card Layout */}
    {isLoading ? (
     <div className="flex flex-col gap-3 md:hidden">
      {[1, 2, 3].map((n) => (
       <div key={n} className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm animate-pulse flex flex-col gap-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-2 mt-2">
         <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
         <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
         <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
       </div>
      ))}
     </div>
    ) : data && data.length > 0 ? (
     <div className="flex flex-col gap-3 md:hidden">
      {data.map((item, idx) => {
       const val = item.variance;
       const isNegative = val < 0;
       const isPositive = val > 0;
       return (
        <div 
         key={idx} 
         className="bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3"
        >
         {/* Top: Item Name & SKU */}
         <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-[#0B1220] dark:text-white">
           {item.name}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
           {item.sku}
          </span>
         </div>

         {/* Middle Grid: System Qty, Counted Qty, Variance */}
         <div className="grid grid-cols-3 gap-3 py-2 border-t border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex flex-col gap-0.5">
           <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('table.system_qty')}
           </span>
           <span dir="ltr" className="font-mono text-sm font-semibold tabular-nums text-[#0B1220] dark:text-gray-200">
            {formatQuantity(item.systemQty, locale)}
           </span>
          </div>
          <div className="flex flex-col gap-0.5">
           <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('table.counted_qty')}
           </span>
           <span dir="ltr" className="font-mono text-sm font-semibold tabular-nums text-[#0B1220] dark:text-gray-200">
            {formatQuantity(item.countedQty, locale)}
           </span>
          </div>
          <div className="flex flex-col gap-0.5">
           <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t('table.variance')}
           </span>
           <span 
            dir="ltr" 
            className={cn(
             "font-mono text-sm font-bold tabular-nums",
             isNegative ? "text-destructive" : isPositive ? "text-[#b48e67]" : "text-[#0B1220] dark:text-gray-200"
            )}
           >
            {val > 0 ? `+${formatQuantity(val, locale)}` : formatQuantity(val, locale)}
           </span>
          </div>
         </div>

         {/* Bottom: Reason (if applicable) */}
         {item.reason && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-850 p-2 rounded-lg">
           <span className="font-semibold shrink-0">{t('table.reason')}:</span>
           <span className="break-all">{item.reason}</span>
          </div>
         )}
        </div>
       );
      })}
     </div>
    ) : (
     <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 rounded-xl md:hidden">
      <span className="text-sm text-muted-foreground">
       {t('search_placeholder') || 'No variance data found.'}
      </span>
     </div>
    )}
   </div>
  );
}
