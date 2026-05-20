import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasReconnecting, setWasReconnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setWasReconnecting(true);
      setTimeout(() => setWasReconnecting(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasReconnecting };
}
