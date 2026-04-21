'use client';

import { useTranslations } from 'next-intl';
import { Package, FileText, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KPICard } from '@/features/dashboard/components/KPICard';
import { formatCurrency, formatNumber } from '@/utils/currency';
import { useLocale } from '@/hooks/useLocale';

export default function DashboardClient() {
  const t = useTranslations('dashboard');
  const { locale } = useLocale();

  // Mock static data as per Phase 8 planning
  const stats = {
    totalStockValue: 1245300.50,
    baseCurrency: 'SAR',
    pendingPRs: 7,
    activeStocktakes: 2,
    lowStockItems: 14,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        title={t('title')} 
        description={locale === 'ar' ? 'عرض حي لأداء المخازن والمؤشرات الحرجة' : 'Real-time overview of warehouse performance and critical indicators'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t('kpi.total_stock')}
          value={formatCurrency(stats.totalStockValue, stats.baseCurrency, locale as any)}
          icon={Package}
          accent="cyan"
          description={locale === 'ar' ? '+12% من الشهر الماضي' : '+12% from last month'}
        />
        <KPICard
          title={t('kpi.pending_prs')}
          value={formatNumber(stats.pendingPRs, locale as any)}
          icon={FileText}
          accent="amber"
          description={locale === 'ar' ? 'تتطلب مراجعة فورية' : 'Requires immediate review'}
        />
        <KPICard
          title={t('kpi.active_stocktakes')}
          value={formatNumber(stats.activeStocktakes, locale as 'ar' | 'en')}
          icon={ClipboardCheck}
          accent="amber"
          description={locale === 'ar' ? 'مواقع: جدة، الرياض' : 'Locations: Jeddah, Riyadh'}
        />
        <KPICard
          title={t('kpi.low_stock_items')}
          value={formatNumber(stats.lowStockItems, locale as 'ar' | 'en')}
          icon={AlertTriangle}
          accent="red"
          description={locale === 'ar' ? 'عجز محتمل في صنف الحبوب' : 'Potential shortage in cereals'}
        />
      </div>

      {/* Additional Dashboard Sections (Placeholders for Phase 9+) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-50 select-none grayscale">
         <div className="h-64 rounded-xl border border-surface-3 bg-surface-2/30 flex items-center justify-center border-dashed">
            <span className="text-muted-foreground italic">Movement Trends (Coming Soon)</span>
         </div>
         <div className="h-64 rounded-xl border border-surface-3 bg-surface-2/30 flex items-center justify-center border-dashed">
            <span className="text-muted-foreground italic">Top Suppliers by Lead Time (Coming Soon)</span>
         </div>
      </div>
    </div>
  );
}
