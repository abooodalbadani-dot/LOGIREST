'use client';

import * as React from 'react';
import { DataTable } from './DataTable/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { ResourceType } from '@/types/rbac';
import { cn } from '@/lib/utils';

interface PrecisionTableProps<T> {
    data: T[];
    columns: ColumnDef<T, unknown>[];
    isLoading?: boolean;
    isError?: boolean;
    onRetry?: () => void;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        onPageChange: (page: number) => void;
    };
    onExport?: () => void;
    enableExport?: boolean;
    enableVirtualization?: boolean;
    containerHeight?: string | number;
    emptyTitle?: string;
    emptyDescription?: string;
    filters?: React.ReactNode;
    onRowClick?: (row: T) => void;
    collectionName?: ResourceType;
    className?: string;
}

/**
 * PrecisionTable component
 * Implements 'The Precision Ledger' design philosophy:
 * - Tonal Architecture (No 1px solid borders)
 * - IBM Plex Sans Arabic typography
 * - High-density spacing
 * - Glassmorphism effects where appropriate
 */
export function PrecisionTable<T>({
    data,
    columns,
    isLoading,
    isError,
    onRetry,
    pagination,
    onExport,
    enableExport = false,
    enableVirtualization,
    containerHeight = '600px',
    emptyTitle,
    emptyDescription,
    filters,
    onRowClick,
    collectionName,
    className,
}: PrecisionTableProps<T>) {
    const isVirtualized = enableVirtualization !== undefined ? enableVirtualization : data.length > 20;

    return (
        <div className={cn("w-full precision-table-container", className)}>
            <DataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={onRetry}
                pagination={pagination}
                onExport={onExport}
                enableExport={enableExport}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                filters={filters}
                onRowClick={onRowClick}
                collectionName={collectionName}
                // Precision-specific overrides
                rowClassName={() => "group transition-colors duration-150"}
                enableVirtualization={isVirtualized}
                containerHeight={containerHeight}
            />

            <style jsx global>{`
    .precision-table-container table {
     border-collapse: separate;
     border-spacing: 0;
    }
    
    .precision-table-container thead th {
     @apply text-label-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-4 px-6;
     background: color-mix(in srgb, var(--surface-container-low) 50%, transparent);
     backdrop-filter: blur(8px);
    }
    
    .precision-table-container tbody tr {
     @apply border-none;
    }
    
    .precision-table-container tbody td {
     @apply py-3 px-6 text-body-md font-medium;
     border-top: 1px solid transparent; /* Ghost spacing */
    }
    
    /* Alternating tonal background instead of borders */
    .precision-table-container tbody tr:nth-child(even) {
     background-color: var(--surface-container-low);
    }
    
    .precision-table-container tbody tr:hover {
     background-color: color-mix(in srgb, var(--primary) 8%, var(--surface-container-low));
    }

    /* RTL Specific adjustments for typography */
    [dir="rtl"] .precision-table-container {
     font-family: var(--font-sans);
    }
   `}</style>
        </div>
    );
}
