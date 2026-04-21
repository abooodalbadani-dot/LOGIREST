'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { useLocale } from '@/hooks/useLocale';

export default function DashboardPage() {
  const { t } = useLocale();

  return (
    <div className="w-full">
      <PageHeader 
        title={t('Navigation.dashboard' as any)} 
        description="نظرة عامة على النظام والمؤشرات الرئيسية"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder cards */}
        <div className="bg-surface-1 border border-white/5 rounded-lg p-6 flex flex-col items-center justify-center min-h-[150px]">
          <span className="text-muted-foreground">مؤشر 1</span>
        </div>
        <div className="bg-surface-1 border border-white/5 rounded-lg p-6 flex flex-col items-center justify-center min-h-[150px]">
          <span className="text-muted-foreground">مؤشر 2</span>
        </div>
        <div className="bg-surface-1 border border-white/5 rounded-lg p-6 flex flex-col items-center justify-center min-h-[150px]">
          <span className="text-muted-foreground">مؤشر 3</span>
        </div>
      </div>
    </div>
  );
}
