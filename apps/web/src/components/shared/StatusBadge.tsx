'use client';
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { z } from "zod"
import { getStatusConfig } from "@/domain/status-ui-map"

export const BadgeStatusSchema = z.enum([
 'DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'RECEIVED', 'REJECTED', 'CANCELLED', 
 'HEALTHY', 'LOW', 'CRITICAL', 'DELIVERED', 'COMPLETED', 'IN_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'LOCKED', 'ON_HOLD', 'ISSUED', 'PARTIAL',
 'IN_TRANSIT', 'PENDING', 'LOW_STOCK', 'REVIEW', 'OPEN', 'ACTIVE', 'INACTIVE', 'COUNTING', 'STARTED', 'COUNTING_COMPLETED', 'VARIANCE_SUBMITTED',
 'FULFILLED', 'VOIDED'
]);

export type BadgeStatus = z.infer<typeof BadgeStatusSchema>;

const statusBadgeVariants = cva(
 "inline-flex items-center rounded-full px-2.5 py-0.5 text-label-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase whitespace-nowrap",
 {
  variants: {
  variant: {
  default:
  "bg-muted/50 text-muted-foreground border-none hover:bg-muted",
  brand:
  "bg-primary/15 text-primary border-none hover:bg-primary/25",
  warning:
  "bg-amber-500/10 text-amber-500 border-none hover:bg-amber-500/20",
  error:
  "bg-red-500/10 text-red-500 border-none hover:bg-red-500/20",
  success:
  "bg-emerald-500/10 text-emerald-500 border-none hover:bg-emerald-500/20",
  outline: 
  "text-muted-foreground bg-transparent border border-border/50",
  info: 
  "bg-cyan-500/10 text-cyan-500 border-none hover:bg-cyan-500/20",
  },
  },
 defaultVariants: {
 variant: "default",
 },
 }
)

export type BadgeVariant = "default" | "brand" | "warning" | "error" | "success" | "outline" | "info";

export interface StatusBadgeProps
 extends React.HTMLAttributes<HTMLDivElement>,
 VariantProps<typeof statusBadgeVariants> {
 status?: BadgeStatus | string; 
 configMap?: Record<string, { variant: BadgeVariant; labelKey: string }>;
}

export function StatusBadge({ className, variant, status, configMap, children, ...props }: StatusBadgeProps) {
 const t = useTranslations('common.statuses');
 
 const config = React.useMemo(() => {
  if (!status) return null;
  return getStatusConfig(status.toUpperCase(), configMap);
 }, [status, configMap]);

 const mappedVariant = (variant || config?.variant || "default") as BadgeVariant;

 // Handle translation if status is provided and no children
 const content = children || (status ? t(config?.labelKey.split('.').pop() || status.toLowerCase()) : null);

 return (
 <div className={cn(statusBadgeVariants({ variant: mappedVariant }), className)} {...props}>
 {content}
 </div>
 )
}
