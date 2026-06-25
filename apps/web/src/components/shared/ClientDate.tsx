'use client';

import React, { useEffect, useState } from 'react';
import { formatDate } from '@/utils/dateFormatter';

interface ClientDateProps {
  dateString?: Date | string | null;
  format?: string;
  className?: string;
  fallback?: string;
}

export function ClientDate({
  dateString,
  format = 'DD/MM/YYYY HH:mm',
  className,
  fallback = '00/00/0000 00:00',
}: ClientDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className={`opacity-0 ${className || ''}`}>{fallback}</span>;
  }

  return (
    <span dir="ltr" className={`[font-variant-numeric:tabular-nums] ${className || ''}`}>
      {formatDate(dateString, format)}
    </span>
  );
}
