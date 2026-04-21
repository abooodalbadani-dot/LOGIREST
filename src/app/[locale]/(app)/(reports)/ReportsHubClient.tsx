'use client';

import { useTranslations } from 'next-intl';
import { generateCSV } from '@/utils/export';
import { BarChart3, Clock, ShoppingCart, ClipboardCheck } from 'lucide-react';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  exportLabel: string;
}

function ReportCard({ title, description, icon, onExport, exportLabel }: ReportCardProps) {
  return (
    <div className="border border-surface-3 rounded bg-surface-1 p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-surface-2 flex items-center justify-center text-neon-cyan">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-muted">{description}</p>
        </div>
      </div>
      <button
        onClick={onExport}
        className="self-start px-4 py-2 bg-surface-2 border border-surface-3 text-on-surface rounded text-sm font-medium hover:bg-surface-3 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {exportLabel}
      </button>
    </div>
  );
}

export function ReportsHubClient() {
  const t = useTranslations('reports');

  const reports: ReportCardProps[] = [
    {
      title: t('consumption'),
      description: 'Detailed item consumption and usage analysis',
      icon: <BarChart3 className="w-5 h-5" />,
      onExport: () => generateCSV(
        ['Item Code', 'Item Name', 'Quantity', 'Warehouse', 'Date'],
        [
          ['ITM-001', 'Beef', '50', 'Main Warehouse', '2026-04-20'],
          ['ITM-002', 'Chicken', '30', 'Main Warehouse', '2026-04-20'],
        ],
        'consumption-report.csv',
      ),
      exportLabel: 'Export CSV',
    },
    {
      title: t('expiry'),
      description: 'Items approaching or past expiration dates',
      icon: <Clock className="w-5 h-5" />,
      onExport: () => generateCSV(
        ['Item Code', 'Item Name', 'Lot Number', 'Expiry Date', 'Days Remaining', 'Status'],
        [
          ['ITM-001', 'Beef', 'LOT-2026-A', '2026-05-15', '25', 'Near Expiry'],
          ['ITM-002', 'Chicken', 'LOT-2025-Z', '2026-03-01', '-51', 'Expired'],
        ],
        'expiry-report.csv',
      ),
      exportLabel: 'Export CSV',
    },
    {
      title: t('procurement'),
      description: 'Procurement spending and supplier summary',
      icon: <ShoppingCart className="w-5 h-5" />,
      onExport: () => generateCSV(
        ['PO Number', 'Supplier', 'Currency', 'Total', 'Status', 'Date'],
        [
          ['PO-2026-010', 'Supply Co', 'USD', '500', 'DRAFT', '2026-04-05'],
          ['PO-2026-011', 'Local Supplier', 'SAR', '1000', 'POSTED', '2026-04-06'],
        ],
        'procurement-report.csv',
      ),
      exportLabel: 'Export CSV',
    },
    {
      title: t('variance'),
      description: 'Stocktake count vs system quantity variance',
      icon: <ClipboardCheck className="w-5 h-5" />,
      onExport: () => generateCSV(
        ['Item Code', 'Item Name', 'System Qty', 'Counted Qty', 'Variance', 'Reason'],
        [
          ['ITM-001', 'Beef', '150', '147', '-3', 'Freezer malfunction'],
          ['ITM-002', 'Chicken', '80', '80', '0', ''],
        ],
        'variance-report.csv',
      ),
      exportLabel: 'Export CSV',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reports.map((r) => (
        <ReportCard key={r.title} {...r} />
      ))}
    </div>
  );
}