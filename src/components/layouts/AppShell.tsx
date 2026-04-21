'use client';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useEffect, useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState('ar');
  
  useEffect(() => {
    setLocale(document.documentElement.lang || 'ar');
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="flex flex-1 overflow-hidden" style={{ flexDirection: 'row' }}>
          <Sidebar locale={locale} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 bg-surface-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
