'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

export interface VirtualizedMobileGridProps<T> {
  /** The list of data items to virtualize */
  data: T[];
  /** Callback to render the mobile card for a given item */
  renderCard: (item: T, index: number) => React.ReactNode;
  /** Estimated height of a single card in pixels (default: 200) */
  estimateSize?: number;
  /** Overscan count for pre-rendering offscreen items (default: 5) */
  overscan?: number;
  /** Custom CSS classes for the container */
  className?: string;
  /** Maximum height for the scroll container (default: 650) */
  maxHeight?: number | string;
  /** Custom empty state to render if data is empty */
  emptyState?: React.ReactNode;
  /** Optional key extractor function */
  keyExtractor?: (item: T, index: number) => string | number;
}

function getItemKey<T>(
  item: T,
  index: number,
  keyExtractor?: (item: T, index: number) => string | number,
): string | number {
  if (keyExtractor) {
    return keyExtractor(item, index);
  }
  if (typeof item === 'object' && item !== null && 'id' in item) {
    const idVal = (item as Record<string, unknown>).id;
    if (typeof idVal === 'string' || typeof idVal === 'number') {
      return idVal;
    }
  }
  return index;
}

export function VirtualizedMobileGrid<T>({
  data,
  renderCard,
  estimateSize = 200,
  overscan = 5,
  className,
  maxHeight = 650,
  emptyState,
  keyExtractor,
}: VirtualizedMobileGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data ? data.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (!data || data.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return null;
  }

  // For small lists (<= 4 cards), render a natural flex stack to eliminate scrollbars & truncation
  if (data.length <= 4) {
    return (
      <div className={cn('w-full min-w-0 flex flex-col gap-3 md:hidden', className)}>
        {data.map((item, index) => {
          const key = getItemKey(item, index, keyExtractor);
          return (
            <div key={key} className="w-full">
              {renderCard(item, index)}
            </div>
          );
        })}
      </div>
    );
  }

  const calculatedHeight =
    typeof maxHeight === 'number'
      ? Math.min(data.length * estimateSize, maxHeight)
      : maxHeight;

  return (
    <div
      ref={parentRef}
      className={cn(
        'w-full min-w-0 overflow-y-auto custom-scrollbar md:hidden',
        className,
      )}
      style={{
        height: calculatedHeight,
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = data[virtualRow.index];
          if (!item) return null;
          const key = getItemKey(item, virtualRow.index, keyExtractor);

          return (
            <div
              key={key}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-3"
            >
              {renderCard(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
