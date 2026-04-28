'use client';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useEffect, useState } from 'react';
import { useWarehouseScope } from '@/providers/WarehouseScopeProvider';
import { Lock, AlertTriangle, Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('ar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isLocked } = useWarehouseScope();
  const t = useTranslations('common');
  
  useEffect(() => {
    // Determine locale from HTML lang or fallback
    const htmlLang = document.documentElement.lang || 'ar';
    setLocale(htmlLang);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {isLocked && (
          <div className="bg-status-warning/10 border-b border-status-warning/20 px-4 py-1.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 z-[60]">
            <Lock className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-[11px] font-bold text-status-warning uppercase tracking-widest">
              {t('warehouse_locked')}
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
          </div>
        )}
        
        <Topbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          <div 
            className={cn(
              "fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300",
              isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar Wrapper */}
          <div className={cn(
            "fixed inset-y-0 start-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:z-auto",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}>
            <Sidebar locale={locale} onClose={() => setIsSidebarOpen(false)} />
          </div>

          <main className={cn(
            "flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 bg-background transition-all duration-300",
            isLocked && 'pointer-events-none grayscale-[0.3] opacity-90'
          )}>
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
