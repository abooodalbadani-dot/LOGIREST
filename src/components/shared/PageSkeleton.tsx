'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from './TableSkeleton';

export function PageSkeleton() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-4 w-[500px]" />
          </div>
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>

      {/* Filters & Table Skeleton */}
      <div className="space-y-6">
        <Card className="p-8 space-y-6 border-none bg-surface-container-low">
          <div className="flex gap-6">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="flex-[2] space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </Card>
        
        <Card className="overflow-hidden border-none bg-surface-container-lowest">
          <TableSkeleton rows={8} />
        </Card>
      </div>
    </div>
  );
}
