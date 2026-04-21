import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, X, Circle } from "lucide-react"

export interface TimelineStep {
  id: string;
  label: string;
  status: "completed" | "current" | "pending" | "error";
  date?: string;
}

export interface StatusTimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: TimelineStep[];
}

export function StatusTimeline({ steps, className, ...props }: StatusTimelineProps) {
  return (
    <div className={cn("flex w-full items-start", className)} {...props}>
      {steps.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;
        
        // A completed step means the path TO IT and FROM IT (if the next is also completed/current) is colored.
        // But to keep it simple, we color the line BEFORE the node if it's completed or current,
        // and color the line AFTER the node if it's completed.
        const leftLineColored = step.status === "completed" || step.status === "current" || step.status === "error";
        const rightLineColored = step.status === "completed";

        const iconClasses = {
          completed: "bg-brand-primary text-black shadow-[0_0_8px_rgba(58,190,255,0.4)]",
          current: "border-2 border-brand-primary bg-surface-2 text-brand-primary",
          pending: "border-2 border-surface-4 bg-surface-1 text-surface-4",
          error: "bg-neon-error text-black shadow-[0_0_8px_rgba(255,180,171,0.4)]"
        };

        const textClasses = {
          completed: "text-foreground font-medium",
          current: "text-brand-primary font-bold",
          pending: "text-muted-foreground",
          error: "text-neon-error font-bold"
        };

        const renderIcon = () => {
          if (step.status === "completed") return <Check className="h-4 w-4" />
          if (step.status === "error") return <X className="h-4 w-4" />
          if (step.status === "current") return <Circle className="h-3 w-3 fill-current" />
          // Pending is empty inside
          return null;
        }

        return (
          <div key={step.id} className="flex flex-col items-center justify-start text-center flex-1 relative">
            {/* Lines and Node Container */}
            <div className="flex items-center w-full justify-center">
              {/* Leader Line (logical start/before node) */}
              <div 
                className={cn(
                  "h-0.5 w-full", 
                  isFirst ? "bg-transparent" : (leftLineColored ? "bg-brand-primary" : "bg-surface-4")
                )} 
              />
              
              {/* Node */}
              <div
                className={cn(
                  "flex shrink-0 h-8 w-8 items-center justify-center rounded-full transition-colors z-10",
                  iconClasses[step.status]
                )}
              >
                {renderIcon()}
              </div>

              {/* Trailing Line (logical end/after node) */}
              <div 
                className={cn(
                  "h-0.5 w-full", 
                  isLast ? "bg-transparent" : (rightLineColored ? "bg-brand-primary" : "bg-surface-4")
                )} 
              />
            </div>

            {/* Texts */}
            <div className="mt-3 flex flex-col items-center px-1">
              <span className={cn("text-xs uppercase tracking-wider", textClasses[step.status])}>
                {step.label}
              </span>
              {step.date && (
                <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                  {step.date}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
