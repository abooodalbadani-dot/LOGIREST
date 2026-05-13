'use client';

import { useState, useEffect, useSyncExternalStore, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Assume online on server
}

export function NetworkStatusBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOffline = !isOnline;
  const [showBackOnline, setShowBackOnline] = useState(false);
  const t = useTranslations('common');
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      wasOfflineRef.current = false;
      return () => clearTimeout(timer);
    } else if (!isOnline) {
      wasOfflineRef.current = true;
    }
  }, [isOnline]);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className={cn(
      "fixed top-0 inset-x-0 z-[9999] flex items-center justify-center py-1.5 px-4 transition-all duration-200 animate-in slide-in-from-top",
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
