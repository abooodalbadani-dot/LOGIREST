import * as React from "react"
import { cn } from "@/lib/utils"

export interface DocumentReadOnlyOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  className?: string;
  lockedMessage?: string;
}

export function DocumentReadOnlyOverlay({ 
  children, 
  isLocked, 
  className,
  lockedMessage = "Document is locked and cannot be edited"
}: DocumentReadOnlyOverlayProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div className={cn("relative group transition-opacity", className)}>
      <div 
        className="absolute inset-0 z-20 cursor-not-allowed bg-transparent" 
        aria-hidden="true" 
        title={lockedMessage} 
      />
      <div className="opacity-70 pointer-events-none grayscale-[0.3]">
        {children}
      </div>
    </div>
  )
}
