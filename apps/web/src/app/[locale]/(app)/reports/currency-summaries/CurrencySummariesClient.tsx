'use client';

import { useTranslations, useLocale } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { useCurrencySummaryReport, CurrencySummaryReport } from '@/features/reports/hooks/useReports';
import { ReportExportMenu } from '@/components/shared/ReportExportMenu';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatRate } from '@/utils/currency';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';

export default function CurrencySummariesClient() {
    const t = useTranslations('reports');
    const locale = useLocale();
    const { currency: baseCurrency } = useBaseCurrency();
    const { data, isLoading } = useCurrencySummaryReport();

    const columns: ColumnDef<CurrencySummaryReport>[] = [
        {
            accessorKey: 'currency',
            header: t('table.currency'),
            meta: { numeric: true },
        },
        {
            accessorKey: 'total',
            header: t('table.total'),
            meta: { numeric: true },
            cell: ({ row }) => formatCurrency(row.getValue('total'), row.original.currency, locale as 'ar' | 'en'),
        },
        {
            accessorKey: 'totalBase',
            header: t('table.total_base', { currency: baseCurrency }),
            meta: { numeric: true },
            cell: ({ row }) => formatCurrency(row.getValue('totalBase'), baseCurrency, locale as 'ar' | 'en'),
        },
        {
            accessorKey: 'lastRate',
            header: t('table.last_rate'),
            meta: { numeric: true },
            cell: ({ row }) => formatRate(row.getValue('lastRate'), locale as 'ar' | 'en', 6),
        },
    ];

    const exportColumns = [
        { header: t('table.currency'), key: 'currency', width: 15 },
        { header: t('table.total'), key: 'total', width: 20 },
        { header: t('table.last_rate'), key: 'lastRate', width: 15 },
        { header: t('table.total_base', { currency: baseCurrency }), key: 'totalBase', width: 20 },
    ];

    return (
        <div className="min-w-0 gap-6 flex-1 fade-in space-y-8 slide-in-from-bottom-4 animate-in flex-col flex duration-700 w-full">
            <PageHeader
                title={t('currency_summaries')}
                subtitle={t('currency_summaries_desc')}
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
                        filename="Currency_Summary_Report"
                        title={t('currency_summaries')}
                        countCheckParams={{ type: 'currency-summaries' }}
                    />
                }
                collectionName="reports"
                renderMobileCard={(item: CurrencySummaryReport) => (
                    <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all hover:border-brand-gold/30 space-y-3">
                        {/* Header: Currency code & Rate */}
                        <div className="flex items-center justify-between w-full pb-3 border-b border-border/40">
                            <span className="font-mono font-bold text-sm bg-surface-container-highest/60 border border-surface-variant/10 px-2.5 py-1 rounded text-foreground" dir="ltr">
                                {item.currency}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                                {t('table.last_rate')}: <span dir="ltr" className="font-mono text-foreground">{formatRate(item.lastRate, locale as 'ar' | 'en', 2)}</span>
                            </span>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 w-full bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3 text-center">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                                    {t('table.total')}
                                </span>
                                <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
                                    {formatCurrency(item.total, item.currency, locale as 'ar' | 'en')}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1 border-s border-border/40 ps-2">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">
                                    {t('table.total_base', { currency: baseCurrency })}
                                </span>
                                <span className="font-mono text-xs font-black text-operational-cyan" dir="ltr">
                                    {formatCurrency(item.totalBase, baseCurrency, locale as 'ar' | 'en')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            />
        </div>
    );
}
