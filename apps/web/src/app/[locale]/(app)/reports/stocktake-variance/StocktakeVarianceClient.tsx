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
    { header: t('table.sku'), key: 'sku', width: 15 },
    { header: t('table.item'), key: 'name', width: 30 },
    { header: t('table.system_qty'), key: 'systemQty', width: 15 },
    { header: t('table.counted_qty'), key: 'countedQty', width: 15 },
    { header: t('table.variance'), key: 'variance', width: 15 },
    { header: t('table.reason'), key: 'reason', width: 30 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title={t('stocktake_variance')}
          subtitle={t('stocktake_variance_desc')}
          backHref="/reports"
        />
        {sessions.length > 0 && (
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-2xl">
            <span className="text-label-xs font-semibold text-muted-foreground uppercase">
              {t('table.session_number') || 'Session:'}
            </span>
            <Select value={activeSessionId} onValueChange={handleSessionChange}>
              <SelectTrigger className="w-56 bg-surface-container-high border-none rounded-xl text-label-xs text-muted-foreground">
                <SelectValue placeholder={t('select_session')} />
              </SelectTrigger>
              <SelectContent className="bg-surface-container-lowest border-none rounded-xl shadow-2xl">
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
  );
}
