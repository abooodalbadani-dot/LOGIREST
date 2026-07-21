'use client';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useState } from 'react';
import { useWarehouseScope } from '@/providers/WarehouseScopeProvider';
import { Lock, AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isLocked } = useWarehouseScope();
  const t = useTranslations('common');

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden relative w-full h-[100dvh]">
        {isLocked && (
          <div className="bg-status-warning/10 px-4 py-1.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 z-[60] print:hidden">
            <Lock className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-label-xs font-bold text-status-warning uppercase">
              {t('warehouse_locked')}
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
          </div>
        )}

        <div className="print:hidden">
          <Topbar locale={locale} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        </div>

        <div className="flex flex-1 flex-col md:flex-row overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          <div
            className={cn(
              "fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] md:hidden transition-all duration-300 print:hidden",
              isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Wrapper */}
          <div className={cn(
            "fixed top-0 start-0 h-[100dvh] md:h-auto md:inset-y-0 z-[100] w-64 bg-background transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 rtl:md:translate-x-0 md:z-auto print:hidden flex flex-col",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full md:translate-x-0 rtl:md:translate-x-0"
          )}>
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>

          <main className="flex-1 w-full min-w-0 max-w-[100vw] 2xl:max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto bg-background transition-all duration-300 print:w-full print:m-0 print:p-0 print:col-span-full print:overflow-visible">
            {children}
          </main>
        </div>

        {isLocked && (
          <div className="absolute inset-0 pointer-events-none border-[4px] border-status-warning/20 z-50 shadow-[inset_0_0_100px_rgba(245,158,11,0.05)] print:hidden" />
        )}
      </div>
    </div>
  );
}
