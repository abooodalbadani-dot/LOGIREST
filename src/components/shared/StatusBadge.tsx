'use client';
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { DocumentStatus, assertNever } from "@/contracts/statuses"


export const BadgeStatusSchema = z.enum([
 'DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'RECEIVED', 'REJECTED', 'CANCELLED', 
 'HEALTHY', 'LOW', 'CRITICAL', 'DELIVERED', 'COMPLETED', 'IN_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'LOCKED', 'ON_HOLD', 'ISSUED', 'PARTIAL',
  'IN_TRANSIT', 'PENDING', 'LOW_STOCK', 'REVIEW', 'OPEN', 'ACTIVE', 'INACTIVE', 'COUNTING', 'STARTED', 
 'FULFILLED'
]);


export type BadgeStatus = z.infer<typeof BadgeStatusSchema>;

const statusBadgeVariants = cva(
 "inline-flex items-center rounded-full px-2.5 py-0.5 text-label-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase whitespace-nowrap",
 {
 variants: {
 variant: {
 default:
 "bg-surface-container-high text-muted-foreground hover:bg-surface-container-highest",
 brand:
 "bg-primary/15 text-primary hover:bg-primary/25",
 warning:
 "bg-status-warning/15 text-status-warning hover:bg-status-warning/25",
 error:
 "bg-status-error/15 text-status-error hover:bg-status-error/25",
 success:
 "bg-status-success/15 text-status-success hover:bg-status-success/25",
 outline: "text-foreground bg-surface-container border border-border-surface",
 info: "bg-status-info/15 text-status-info hover:bg-status-info/25",
 },
 },
 defaultVariants: {
 variant: "default",
 },
 }
)

export interface StatusBadgeProps
 extends React.HTMLAttributes<HTMLDivElement>,
 VariantProps<typeof statusBadgeVariants> {
 status?: BadgeStatus | string; 
 configMap?: Record<string, any>;
}

import { getStatusConfig } from "@/domain/status-ui-map";

export function StatusBadge({ className, variant, status, configMap, children, ...props }: StatusBadgeProps) {
  const t = useTranslations('common.status');
  
  const config = React.useMemo(() => {
    if (!status) return null;
    return getStatusConfig(status.toUpperCase(), configMap);
  }, [status, configMap]);

  const mappedVariant = variant || (config?.variant as any) || "default";

  // Handle translation if status is provided and no children
  const content = children || (status ? t(config?.labelKey.split('.').pop() || status.toLowerCase()) : null);

 return (
 <div className={cn(statusBadgeVariants({ variant: mappedVariant }), className)} {...props}>
 {content}
 </div>
 )
}
