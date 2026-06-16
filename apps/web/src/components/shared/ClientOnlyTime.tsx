'use client';

import { useEffect, useState } from 'react';
import { formatTime, formatDate, formatDateTime } from '@/utils/currency';

interface ClientOnlyTimeProps {
 date?: Date | string | null;
 mode?: 'time' | 'date' | 'datetime';
 showSeconds?: boolean;
 locale?: 'ar' | 'en';
 fallback?: string;
 className?: string;
}

/**
 * A component that renders date/time only on the client side to prevent hydration mismatches.
 * Use this whenever you need to display "now" or relative times that differ between server and client.
 */
export function ClientOnlyTime({ 
 date, 
 mode = 'time', 
 showSeconds = false,
 locale = 'en', 
 fallback = '...', 
 className 
}: ClientOnlyTimeProps) {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);
 }, []);

 if (!mounted) {
  return <span className={className}>{fallback}</span>;
 }

 const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
 
 let displayValue = '';
 if (mode === 'time') {
  displayValue = formatTime(d, locale as 'ar' | 'en');
 } else if (mode === 'datetime') {
  displayValue = formatDateTime(d, locale as 'ar' | 'en', showSeconds);
 } else {
  displayValue = formatDate(d, locale as 'ar' | 'en');
 }

 return <span className={className}>{displayValue}</span>;
}
