'use client';

import React from 'react';
import { ClientDate } from './ClientDate';

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
 * Delegates to the timezone-safe ClientDate component.
 */
export function ClientOnlyTime({ 
 date, 
 mode = 'time', 
 showSeconds = false,
 locale = 'en', 
 fallback = '...', 
 className 
}: ClientOnlyTimeProps) {
  let format = 'DD/MM/YYYY HH:mm';
  if (mode === 'time') {
    format = showSeconds ? 'HH:mm:ss' : 'HH:mm';
  } else if (mode === 'date') {
    format = 'DD/MM/YYYY';
  } else if (mode === 'datetime') {
    format = showSeconds ? 'DD/MM/YYYY HH:mm:ss' : 'DD/MM/YYYY HH:mm';
  }

  return (
    <ClientDate
      dateString={date}
      format={format}
      className={className}
      fallback={fallback}
    />
  );
}
