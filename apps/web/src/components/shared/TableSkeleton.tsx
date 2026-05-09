'use client';

import { Skeleton } from '@/components/ui/skeleton';
<<<<<<< HEAD:src/components/shared/TableSkeleton.tsx
import { Card } from '@/components/ui/card';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-container-low rounded-t-xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border-muted/20">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4 opacity-50" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
=======
import { ColumnDef } from '@tanstack/react-table';

interface TableSkeletonProps<T> {
  columns?: ColumnDef<T, any>[];
  rows?: number;
}

export function TableSkeleton<T>({ columns, rows = 8 }: TableSkeletonProps<T>) {
  const displayColumns = columns || Array(5).fill(null);

  return (
    <div className="w-full border border-border-muted/20 rounded-xl overflow-hidden bg-surface-container-lowest">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4 px-4 py-3 bg-surface-container-low border-b border-border-muted/20">
        {displayColumns.map((_, i) => (
          <div 
            key={i} 
            className="flex-1"
            style={{ 
              minWidth: i === 0 ? '200px' : '120px',
              flexGrow: i === 0 ? 2 : 1 
            }}
          >
            <Skeleton className="h-4 w-24 opacity-60" />
          </div>
        ))}
      </div>

      {/* Rows Skeleton */}
      <div className="divide-y divide-border-muted/10">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-4 py-4 hover:bg-surface-container-lowest transition-colors">
            {displayColumns.map((_, colIndex) => (
              <div 
                key={colIndex} 
                className="flex-1"
                style={{ 
                  minWidth: colIndex === 0 ? '200px' : '120px',
                  flexGrow: colIndex === 0 ? 2 : 1 
                }}
              >
                {colIndex === 0 ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2 opacity-40" />
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-4 w-2/3" />
                )}
              </div>
            ))}
>>>>>>> 002-frontend-baseline:apps/web/src/components/shared/TableSkeleton.tsx
          </div>
        ))}
      </div>
    </div>
  );
}
