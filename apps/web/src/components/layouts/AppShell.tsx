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
        <div className="flex h-screen overflow-hidden bg-background">
            <div className="flex flex-1 flex-col overflow-hidden relative">
                {isLocked && (
                    <div className="bg-status-warning/10 px-4 py-1.5 flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 z-[60]">
                        <Lock className="w-3.5 h-3.5 text-status-warning" />
                        <span className="text-label-xs font-bold text-status-warning uppercase">
                            {t('warehouse_locked')}
                        </span>
                        <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
                    </div>
                )}

                <Topbar locale={locale} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

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
                        "fixed inset-y-0 start-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 rtl:md:translate-x-0 md:z-auto",
                        isSidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full md:translate-x-0 rtl:md:translate-x-0"
                    )}>
                        <Sidebar onClose={() => setIsSidebarOpen(false)} />
                    </div>

                    <main className={cn(
                        "flex-1 overflow-x-hidden overflow-y-auto bg-background transition-all duration-300",
                        isLocked && 'pointer-events-none grayscale-[0.3] opacity-90'
                    )}>
                        <div className="w-full min-h-screen flex justify-center">
                            <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 md:py-6">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>

                {isLocked && (
                    <div className="absolute inset-0 pointer-events-none border-[4px] border-status-warning/20 z-50 shadow-[inset_0_0_100px_rgba(245,158,11,0.05)]" />
                )}
            </div>
        </div>
    );
}
