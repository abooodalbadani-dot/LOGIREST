'use client';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useEffect, useState } from 'react';
import { useWarehouseScope } from '@/providers/WarehouseScopeProvider';
import { Lock, AlertTriangle } from 'lucide-react';

import { useTranslations } from 'next-intl';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('ar');
  const { isLocked } = useWarehouseScope();
  const t = useTranslations('common');
  
  useEffect(() => {
    setTimeout(() => {
      setLocale(document.documentElement.lang || 'ar');
    }, 0);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {isLocked && (
          <div className="bg-status-warning/10 border-b border-status-warning/20 px-4 py-1.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
            <Lock className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-[11px] font-bold text-status-warning uppercase tracking-widest">
              {t('warehouse_locked')}
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
          </div>
        )}
        <Topbar />
        <div className="flex flex-1 overflow-hidden" style={{ flexDirection: 'row' }}>
          <Sidebar locale={locale} />
          <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 bg-background ${isLocked ? 'pointer-events-none grayscale-[0.3] opacity-90' : ''}`}>
            {children}
          </main>
        </div>
        
        {isLocked && (
          <div className="absolute inset-0 pointer-events-none border-[4px] border-status-warning/20 z-50 shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]" />
        )}
      </div>
    </div>
  );
}
