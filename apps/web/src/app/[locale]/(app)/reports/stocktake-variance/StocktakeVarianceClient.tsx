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

    {/* Main Data View */}
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
     renderMobileCard={(item: StocktakeVarianceReport) => {
      const val = item.variance;
      const isNegative = val < 0;
      const isPositive = val > 0;
      return (
       <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
        {/* Header: Name + SKU */}
        <div className="flex flex-col gap-1 min-w-0 w-full pb-3 border-b border-border/40 text-start items-start">
         <span className="text-sm font-bold text-foreground truncate w-full" title={item.name}>
          {item.name}
         </span>
         <span className="font-mono font-bold text-[11px] bg-surface-container-highest/60 border border-surface-variant/10 px-2 py-0.5 rounded text-muted-foreground text-start rtl:text-right ltr:text-left" dir="ltr">
          {item.sku}
         </span>
        </div>

        {/* Grid: System Qty, Counted Qty, Variance */}
        <div className="grid grid-cols-3 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
         <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
           {t('table.system_qty')}
          </span>
          <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
           {formatQuantity(item.systemQty, locale)}
          </span>
         </div>

         <div className="flex flex-col gap-1 border-x border-border/40 px-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
           {t('table.counted_qty')}
          </span>
          <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
           {formatQuantity(item.countedQty, locale)}
          </span>
         </div>

         <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
           {t('table.variance')}
          </span>
          <span 
           dir="ltr" 
           className={cn(
            "font-mono text-xs font-black",
            isNegative ? "text-destructive" : isPositive ? "text-operational-cyan" : "text-foreground"
           )}
          >
           {val > 0 ? `+${formatQuantity(val, locale)}` : formatQuantity(val, locale)}
          </span>
         </div>
        </div>

        {/* Reason */}
        {item.reason && (
         <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/30">
          <span className="font-bold shrink-0">{t('table.reason')}:</span>
          <span className="break-all">{item.reason}</span>
         </div>
        )}
       </div>
      );
     }}
    />
   </div>
  );
}
