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
 />
 </div>
 );
}
