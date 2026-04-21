import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wider whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-surface-3 text-muted-foreground hover:bg-surface-4",
        brand:
          "border-transparent bg-brand-primary/15 text-brand-primary hover:bg-brand-primary/25",
        warning:
          "border-transparent bg-neon-amber/15 text-neon-amber hover:bg-neon-amber/25",
        error:
          "border-transparent bg-neon-error/15 text-neon-error hover:bg-neon-error/25",
        success:
          "border-transparent border-brand-primary/30 bg-brand-primary/10 text-brand-primary shadow-[0_0_8px_rgba(58,190,255,0.2)] hover:bg-brand-primary/20",
        outline: "text-foreground border-border",
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
  status?: string; 
}

export function StatusBadge({ className, variant, status, children, ...props }: StatusBadgeProps) {
  let mappedVariant = variant;
  
  if (!mappedVariant && status) {
      const s = status.toUpperCase();
      if (["APPROVED", "DELIVERED", "COMPLETED", "IN_STOCK", "ACTIVE"].includes(s)) {
          mappedVariant = "success";
      } else if (["PENDING", "IN_TRANSIT", "LOW_STOCK", "ON_HOLD", "REVIEW"].includes(s)) {
          mappedVariant = "warning";
      } else if (["REJECTED", "CANCELLED", "OUT_OF_STOCK", "EXPIRED", "LOCKED"].includes(s)) {
          mappedVariant = "error";
      } else if (["SUBMITTED", "POSTED", "ISSUED"].includes(s)) {
          mappedVariant = "brand";
      } else {
          mappedVariant = "default"; // DRAFT, INACTIVE, etc.
      }
  }

  return (
    <div className={cn(statusBadgeVariants({ variant: mappedVariant }), className)} {...props}>
      {children || status}
    </div>
  )
}
