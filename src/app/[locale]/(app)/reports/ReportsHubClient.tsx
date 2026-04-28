'use client';

import { useTranslations } from 'next-intl';
import { generateExcel } from '@/utils/export';
import { BarChart3, Clock, ShoppingCart, ClipboardCheck, Wallet, Activity } from 'lucide-react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { 
  useConsumptionReport, 
  useExpiryReport, 
  useProcurementReport, 
  useVarianceReport, 
  useValuationReport, 
  useAuditReport 
} from '@/features/reports/hooks/useReports';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => void;
  exportLabel: string;
  loading?: boolean;
}

function ReportCard({ title, description, icon, onExport, exportLabel, loading }: ReportCardProps) {
  return (
    <div className="group relative p-8 rounded-3xl border border-border-muted/20 bg-surface-container-low/90 backdrop-blur-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] hover:bg-surface-container-high/95 hover:border-operational-cyan/30 transition-all duration-500 overflow-hidden animate-in fade-in zoom-in-95 fill-mode-both">
      <div className="absolute top-0 start-0 w-full h-1 bg-gradient-to-r from-transparent via-operational-cyan/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high/50 flex items-center justify-center text-operational-cyan shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_30px_rgba(var(--operational-cyan-rgb),0.3)] transition-all duration-500 border border-border-muted/10 group-hover:border-operational-cyan/20">
            {icon}
          </div>
          <div>
            <h3 className="font-black text-foreground text-lg tracking-tight uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[240px] font-bold mt-1 uppercase tracking-wide">{description}</p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-[2px] border-surface-container-low bg-surface-container-high flex items-center justify-center text-[10px] font-black text-muted-foreground/40 shadow-sm -ms-3 first:ms-0 group-hover:border-operational-cyan/10 transition-colors">
              {i}
            </div>
          ))}
        </div>
        <PermissionGate action="export" resource="reports">
          <button
            onClick={onExport}
            disabled={loading}
            className="px-6 py-3 bg-operational-cyan text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2 shadow-[0_16px_32px_-8px_rgba(var(--operational-cyan-rgb),0.3)]"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {exportLabel}
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}


export function ReportsHubClient() {
  const t = useTranslations('reports');

  const consumption = useConsumptionReport();
  const expiry = useExpiryReport();
  const procurement = useProcurementReport();
  const variance = useVarianceReport();
  const valuation = useValuationReport();
  const audit = useAuditReport();

  const reports: ReportCardProps[] = [
    {
      title: t('consumption'),
      description: t('consumption_desc') || 'Detailed item consumption and usage analysis',
      icon: <BarChart3 className="w-6 h-6" />,
      loading: consumption.isLoading,
      onExport: () => consumption.data && generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Quantity', key: 'qty', width: 10 },
          { header: 'Warehouse', key: 'wh', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
        ],
        consumption.data,
        'Consumption_Report'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('expiry'),
      description: t('expiry_desc') || 'Items approaching or past expiration dates',
      icon: <Clock className="w-6 h-6" />,
      loading: expiry.isLoading,
      onExport: () => expiry.data && generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Lot Number', key: 'lot', width: 15 },
          { header: 'Expiry Date', key: 'expiry', width: 15 },
          { header: 'Days Remaining', key: 'days', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
        ],
        expiry.data,
        'Expiry_Audit'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('procurement'),
      description: t('procurement_desc') || 'Procurement spending and supplier summary',
      icon: <ShoppingCart className="w-6 h-6" />,
      loading: procurement.isLoading,
      onExport: () => procurement.data && generateExcel(
        [
          { header: 'PO Number', key: 'id', width: 15 },
          { header: 'Supplier', key: 'supplier', width: 25 },
          { header: 'Currency', key: 'currency', width: 10 },
          { header: 'Total', key: 'total', width: 15 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Date', key: 'date', width: 15 },
        ],
        procurement.data,
        'Procurement_Summary'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('variance'),
      description: t('variance_desc') || 'Stocktake count vs system quantity variance',
      icon: <ClipboardCheck className="w-6 h-6" />,
      loading: variance.isLoading,
      onExport: () => variance.data && generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'System Qty', key: 'sys', width: 15 },
          { header: 'Counted Qty', key: 'cnt', width: 15 },
          { header: 'Variance', key: 'var', width: 15 },
          { header: 'Reason', key: 'reason', width: 25 },
        ],
        variance.data,
        'Stocktake_Variance'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('inventory_value') || 'Inventory Value',
      description: t('inventory_value_desc') || 'Current stock valuation based on weighted average cost',
      icon: <Wallet className="w-6 h-6" />,
      loading: valuation.isLoading,
      onExport: () => valuation.data && generateExcel(
        [
          { header: 'Item Code', key: 'code', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Stock Qty', key: 'qty', width: 15 },
          { header: 'Unit Cost', key: 'cost', width: 15 },
          { header: 'Total Value', key: 'total', width: 20 },
        ],
        valuation.data,
        'Inventory_Valuation'
      ),
      exportLabel: 'Excel Report',
    },
    {
      title: t('operational_audit') || 'Operational Audit',
      description: t('operational_audit_desc') || 'Traceability of all movements and adjustments',
      icon: <Activity className="w-6 h-6" />,
      loading: audit.isLoading,
      onExport: () => audit.data && generateExcel(
        [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'User', key: 'user', width: 20 },
          { header: 'Action', key: 'action', width: 15 },
          { header: 'Entity', key: 'entity', width: 15 },
          { header: 'Reference', key: 'ref', width: 20 },
        ],
        audit.data,
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