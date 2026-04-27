'use client';

import { useTranslations } from 'next-intl';
import { Package, FileText, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/features/dashboard/components/KPICard';
import { formatCurrency, formatNumber, formatTime } from '@/utils/currency';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/providers/AuthProvider';
import { NearExpiryWidget } from '@/features/dashboard/components/NearExpiryWidget';
import { PendingDocumentsWidget } from '@/features/dashboard/components/PendingDocumentsWidget';

export default function DashboardClient() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { locale } = useLocale();
  const { user } = useAuth();
  const isRtl = locale === 'ar';

  // Mock static data as per Phase 8 planning
  const stats = {
    totalStockValue: 1245300.50,
    baseCurrency: 'SAR',
    pendingPRs: 7,
    activeStocktakes: 2,
    lowStockItems: 14,
  };
  
  // Visibility logic based on roles
  const canSeeApprovals = user?.role === 'ADMIN' || user?.role === 'INV_MGR' || user?.role === 'APPROVER';
  const canSeeNearExpiry = true;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader 
        title={t('title')} 
        description={t('description')}
        actions={
          <div className="flex flex-col items-end gap-1">
             <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                {tc('system_stats.live_updates')}
             </div>
              <div className="text-[9px] font-bold text-muted-foreground/40">
                {tc('system_stats.last_sync')}: {formatTime(new Date(), locale as 'ar' | 'en')}
              </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t('kpi.total_stock')}
          value={formatCurrency(stats.totalStockValue, stats.baseCurrency, locale as 'ar' | 'en')}
          icon={Package}
          accent="cyan"
          trend={{ value: '12%', isPositive: true }}
          description={t('kpi.vs_last_month')}
        />
        <KPICard
          title={t('kpi.pending_prs')}
          value={formatNumber(stats.pendingPRs, locale as 'ar' | 'en')}
          icon={FileText}
          accent="amber"
          description={t('kpi.immediate_review')}
        />
        <KPICard
          title={t('kpi.active_stocktakes')}
          value={formatNumber(stats.activeStocktakes, locale as 'ar' | 'en')}
          icon={ClipboardCheck}
          accent="amber"
          description={t('kpi.jeddah_riyadh_active')}
        />
        <KPICard
          title={t('kpi.low_stock_items')}
          value={formatNumber(stats.lowStockItems, locale as 'ar' | 'en')}
          icon={AlertTriangle}
          accent="red"
          trend={{ value: '4', isPositive: false }}
          description={t('kpi.critical_items')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-muted/50 px-1">
            {t('expiry_control')}
          </h4>
          {canSeeNearExpiry && <NearExpiryWidget locale={locale} />}
        </div>
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-muted/50 px-1">
            {t('approval_workflow')}
          </h4>
          {canSeeApprovals && <PendingDocumentsWidget locale={locale} />}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-muted/30 px-1">
          {t('business_intelligence')}
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-30 grayscale pointer-events-none filter blur-[1px]">
           <div className="lg:col-span-2 h-48 rounded bg-surface-container-low flex items-center justify-center">
              <span className="text-on-surface-muted italic text-[10px] font-black tracking-widest uppercase">Movement Analytics (Phase 12)</span>
           </div>
           <div className="h-48 rounded bg-surface-container-low flex items-center justify-center">
              <span className="text-on-surface-muted italic text-[10px] font-black tracking-widest uppercase">Audit Logs</span>
           </div>
        </div>
      </div>
    </div>
  );
}
