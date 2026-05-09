'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { TableSkeleton } from './TableSkeleton';

interface PageSkeletonProps {
  variant?: 'list' | 'detail';
}

export function PageSkeleton({ variant = 'list' }: PageSkeletonProps) {
  if (variant === 'detail') {
    return (
      <div className="p-8 max-w-[1000px] mx-auto space-y-10 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12">
          <div className="flex items-center gap-6">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        {/* Generic Form Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Main Form Section */}
            <Card className="bg-surface-container-low border-none overflow-hidden p-8 space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-surface-variant/10">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-surface-container-low border-none overflow-hidden p-8 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Sidebar Card */}
            <Card className="bg-surface-container-low border-none overflow-hidden p-8 space-y-6">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-surface-container-highest/20 rounded-md">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 p-8">
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

