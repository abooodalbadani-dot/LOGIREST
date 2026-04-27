'use client';

import { useTranslations } from 'next-intl';
import { generateExcel } from '@/utils/export';
import { BarChart3, Clock, ShoppingCart, ClipboardCheck, Wallet, Activity } from 'lucide-react';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  exportLabel: string;
}

function ReportCard({ title, description, icon, onExport, exportLabel }: ReportCardProps) {
  return (
    <div className="group relative p-8 rounded-2xl border-none bg-surface-container-low shadow-xl shadow-primary/5 hover:bg-surface-container-medium transition-all duration-300 overflow-hidden">
      <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center text-cyan-500 shadow-inner shadow-black/20 group-hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all">
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground/60 leading-relaxed max-w-[240px] font-medium">{description}</p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <div className="flex -space-x-3 rtl:space-x-reverse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-4 border-surface-container-low bg-surface-container-highest flex items-center justify-center text-[10px] font-black text-muted-foreground/40 shadow-sm">
              {i}
            </div>
          ))}
        </div>
        <button
          onClick={onExport}
          className="px-6 py-3 bg-cyan-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exportLabel}
        </button>
      </div>
    </div>
  );
}


export function ReportsHubClient() {
  const t = useTranslations('reports');

  const reports: ReportCardProps[] = [
    {
      title: t('consumption'),
      description: t('consumption_desc') || 'Detailed item consumption and usage analysis',
      icon: <BarChart3 className="w-6 h-6" />,
      onExport: () => generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Quantity', key: 'qty', width: 10 },
          { header: 'Warehouse', key: 'wh', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
        ],
        [
          { code: 'ITM-001', name: 'Beef (Frozen)', qty: 50, wh: 'Main Warehouse', date: '2026-04-20' },
          { code: 'ITM-002', name: 'Chicken (Fresh)', qty: 30, wh: 'Main Warehouse', date: '2026-04-20' },
          { code: 'ITM-005', name: 'Cooking Oil', qty: 10, wh: 'Kitchen Pantry', date: '2026-04-21' },
        ],
        'Consumption_Report'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('expiry'),
      description: t('expiry_desc') || 'Items approaching or past expiration dates',
      icon: <Clock className="w-6 h-6" />,
      onExport: () => generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Lot Number', key: 'lot', width: 15 },
          { header: 'Expiry Date', key: 'expiry', width: 15 },
          { header: 'Days Remaining', key: 'days', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
        ],
        [
          { code: 'ITM-001', name: 'Beef', lot: 'LOT-2026-A', expiry: '2026-05-15', days: 25, status: 'Near Expiry' },
          { code: 'ITM-002', name: 'Chicken', lot: 'LOT-2025-Z', expiry: '2026-03-01', days: -51, status: 'Expired' },
        ],
        'Expiry_Audit'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('procurement'),
      description: t('procurement_desc') || 'Procurement spending and supplier summary',
      icon: <ShoppingCart className="w-6 h-6" />,
      onExport: () => generateExcel(
        [
          { header: 'PO Number', key: 'id', width: 15 },
          { header: 'Supplier', key: 'supplier', width: 25 },
          { header: 'Currency', key: 'currency', width: 10 },
          { header: 'Total', key: 'total', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Date', key: 'date', width: 15 },
        ],
        [
          { id: 'PO-2026-010', supplier: 'Supply Co', currency: 'USD', total: 500, status: 'DRAFT', date: '2026-04-05' },
          { id: 'PO-2026-011', supplier: 'Local Supplier', currency: 'SAR', total: 1000, status: 'POSTED', date: '2026-04-06' },
        ],
        'Procurement_Summary'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('variance'),
      description: t('variance_desc') || 'Stocktake count vs system quantity variance',
      icon: <ClipboardCheck className="w-6 h-6" />,
      onExport: () => generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'System Qty', key: 'sys', width: 15 },
          { header: 'Counted Qty', key: 'cnt', width: 15 },
          { header: 'Variance', key: 'var', width: 15 },
          { header: 'Reason', key: 'reason', width: 25 },
        ],
        [
          { code: 'ITM-001', name: 'Beef', sys: 150, cnt: 147, var: -3, reason: 'Freezer malfunction' },
          { code: 'ITM-002', name: 'Chicken', sys: 80, cnt: 80, var: 0, reason: '' },
        ],
        'Stocktake_Variance'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('inventory_value') || 'Inventory Value',
      description: t('inventory_value_desc') || 'Current stock valuation based on weighted average cost',
      icon: <Wallet className="w-6 h-6" />,
      onExport: () => generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Stock Qty', key: 'qty', width: 15 },
          { header: 'Unit Cost', key: 'cost', width: 15 },
          { header: 'Total Value', key: 'total', width: 20 },
        ],
        [
          { code: 'ITM-001', name: 'Beef', qty: 150, cost: 12.5, total: 1875 },
          { code: 'ITM-002', name: 'Chicken', qty: 80, cost: 8.0, total: 640 },
        ],
        'Inventory_Valuation'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('operational_audit') || 'Operational Audit',
      description: t('operational_audit_desc') || 'Traceability of all movements and adjustments',
      icon: <Activity className="w-6 h-6" />,
      onExport: () => generateExcel(
        [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'User', key: 'user', width: 20 },
          { header: 'Action', key: 'action', width: 15 },
          { header: 'Entity', key: 'entity', width: 15 },
          { header: 'Reference', key: 'ref', width: 20 },
        ],
        [
          { date: '2026-04-22 10:30', user: 'Admin User', action: 'POST', entity: 'Adjustment', ref: 'ADJ-2026-001' },
          { date: '2026-04-22 09:15', user: 'Sarah Hassan', action: 'CREATE', entity: 'Issue', ref: 'ISS-2026-042' },
        ],
        'Operational_Audit_Log'
      ),
      exportLabel: 'Excel Report',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {reports.map((r) => (
        <ReportCard key={r.title} {...r} />
      ))}
    </div>
  );
}