'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!window.navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className={cn(
      "fixed top-0 inset-x-0 z-[9999] flex items-center justify-center py-1.5 px-4 transition-all duration-500 animate-in slide-in-from-top",
      isOffline ? "bg-destructive text-destructive-foreground" : "bg-operational-cyan text-white"
    )}>
      <div className="flex items-center gap-2 text-label-xs font-bold uppercase tracking-wider">
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t('network.offline_message')}</span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5" />
            <span>{t('network.online_message')}</span>
          </>
        )}
      </div>
    </div>
  );
}
