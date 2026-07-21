'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useStockMovementsReport, StockMovementsReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatQuantity } from '@/lib/utils';

export default function StockMovementsClient() {
 const t = useTranslations('reports');
 const locale = useLocale() as 'ar' | 'en';
 const { data, isLoading } = useStockMovementsReport();

 const columns: ColumnDef<StockMovementsReport>[] = [
  {
   accessorKey: 'date',
   header: t('table.date'),
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono [font-variant-numeric:tabular-nums]">
     {formatDate(row.getValue('date'), locale)}
    </span>
   ),
  },
  {
   accessorKey: 'reference',
   header: t('table.reference'),
   cell: ({ row }) => {
    const ref = row.getValue('reference') as string;
    if (!ref) return '—';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    if (isUuid) {
     return (
      <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700" dir="ltr">
       {ref.slice(0, 8).toUpperCase()}
      </span>
     );
    }
    return <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{ref}</span>;
   }
  },
  {
   accessorKey: 'type',
   header: t('table.type'),
   cell: ({ row }) => {
    const type = row.getValue('type') as string;
    if (type === 'GOODS_RECEIVED_NOTE') {
     return (
      <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-800">
       استلام بضاعة
      </span>
     );
    }
    if (type === 'ADJUSTMENT') {
     return (
      <span className="px-2.5 py-1 text-[11px] font-bold text-orange-700 bg-orange-100 dark:bg-orange-900/30 rounded-full border border-orange-200 dark:border-orange-800">
       تسوية مخزون
      </span>
     );
    }
    if (type === 'TRANSFER') {
     return (
      <span className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200 dark:border-blue-800">
       تحويل مخزني
      </span>
     );
    }
    if (type === 'INVENTORY_ISSUE') {
     return (
      <span className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-100 dark:bg-red-900/30 rounded-full border border-red-200 dark:border-red-800">
       صرف مخزني
      </span>
     );
    }
    return (
     <span className="px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
      {type}
     </span>
    );
   }
  },
  {
   accessorKey: 'item',
   header: t('table.item'),
  },
  {
   accessorKey: 'qty',
   header: t('table.qty'),
   meta: { numeric: true },
   cell: ({ row }) => (
    <span dir="ltr" className="font-mono [font-variant-numeric:tabular-nums]">
     {formatQuantity(row.getValue('qty'), locale)}
    </span>
   ),
  },
  {
   accessorKey: 'from',
   header: t('table.from'),
  },
  {
   accessorKey: 'to',
   header: t('table.to'),
  },
  {
   accessorKey: 'user',
   header: t('table.user'),
  },
 ];

 const exportColumns = [
  { header: t('table.date'), key: 'date', width: 15 },
  { header: t('table.reference'), key: 'reference', width: 18 },
  { header: t('table.item'), key: 'item', width: 35 },
  { header: t('table.type'), key: 'type', width: 12 },
  { header: t('table.qty'), key: 'qty', width: 8 },
  { header: t('table.user'), key: 'user', width: 12 },
 ];

 return (
  <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
   <PageHeader
    title={t('movements')}
    subtitle={t('movements_desc')}
    backHref="/reports"
   />

   <DataTable
    data={data || []}
    columns={columns}
    isLoading={isLoading}
    enableVirtualization={true}
    exportComponent={
     <ReportExportMenu
      columns={exportColumns}
      data={data || []}
      filename="Stock_Movements_Report"
      title={t('movements')}
      exportRoute="/reports/movements/export"
      countCheckParams={{ type: 'movements' }}
     />
    }
    collectionName="reports"
    renderMobileCard={(item: StockMovementsReport) => (
     <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
      {/* Header: Item + Type badge + Date & Ref */}
      <div className="flex flex-col gap-1 min-w-0 w-full pb-3 border-b border-border/40 text-start items-start">
       <div className="flex items-center justify-between w-full gap-2">
        <span className="text-sm font-bold text-foreground truncate" title={item.item}>
         {item.item}
        </span>
        {item.type && (
         <span className="shrink-0">
          {item.type === 'GOODS_RECEIVED_NOTE' ? (
           <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 rounded-md border border-emerald-200 dark:border-emerald-800">
            استلام بضاعة
           </span>
          ) : item.type === 'ADJUSTMENT' ? (
           <span className="px-2 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 dark:bg-orange-900/30 rounded-md border border-orange-200 dark:border-orange-800">
            تسوية مخزون
           </span>
          ) : item.type === 'TRANSFER' ? (
           <span className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-800">
            تحويل مخزني
           </span>
          ) : item.type === 'INVENTORY_ISSUE' ? (
           <span className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 dark:bg-red-900/30 rounded-md border border-red-200 dark:border-red-800">
            صرف مخزني
           </span>
          ) : (
           <span className="px-2 py-0.5 text-[10px] font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            {item.type}
           </span>
          )}
         </span>
        )}
       </div>
       <div className="flex items-center gap-2 mt-1">
        <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
         {formatDate(item.date, locale)}
        </span>
        {item.reference && (
         <span className="font-mono text-[11px] bg-surface-container-highest/60 border border-surface-variant/10 px-2 py-0.5 rounded text-muted-foreground" dir="ltr">
          {item.reference}
         </span>
        )}
       </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
       <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
         {t('table.qty')}
        </span>
        <span className="font-mono text-xs font-black text-operational-cyan" dir="ltr">
         {formatQuantity(item.qty, locale)}
        </span>
       </div>

       <div className="flex flex-col gap-1 border-s border-border/40 ps-2">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
         {t('table.user')}
        </span>
        <span className="text-xs font-bold text-foreground truncate">
         {item.user || '—'}
        </span>
       </div>
      </div>
     </div>
    )}
   />
  </div>
 );
}
