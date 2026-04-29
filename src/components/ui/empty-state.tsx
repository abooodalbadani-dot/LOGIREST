import * as React from "react"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border-surface bg-surface-container-low/50 p-8 text-center animate-in fade-in-50 duration-500",
        className
      )}
      {...props}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high text-muted-foreground mb-4">
        {icon || <Inbox className="h-10 w-10 opacity-50" />}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-foreground tracking-wide" dir="auto" style={{ unicodeBidi: 'isolate' }}>
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm" dir="auto" style={{ unicodeBidi: 'isolate' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
