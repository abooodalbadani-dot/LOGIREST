import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {}

function Input({ className, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-md border border-white/5 bg-surface-0 px-3 py-2 text-sm transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-neon-cyan focus-visible:border-neon-cyan focus-visible:shadow-[0_0_10px_rgba(58,190,255,0.2)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50 aria-invalid:border-neon-error aria-invalid:ring-1 aria-invalid:ring-neon-error/20 aria-invalid:shadow-[0_0_10px_rgba(255,180,171,0.2)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
