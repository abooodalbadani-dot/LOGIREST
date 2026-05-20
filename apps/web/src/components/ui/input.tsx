import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.ComponentProps<"input"> {}

function Input({ className, type, ...props }: InputProps) {
 return (
 <InputPrimitive
 type={type}
 data-slot="input"
 className={cn(
 "h-12 w-full rounded-[var(--radius)] border border-input bg-white dark:bg-surface-container-lowest px-4 py-2 text-body-md transition-all duration-[140ms] ease-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-md file:font-medium file:text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:bg-destructive/10",
 className
 )}
 {...props}
 />
 )
}

export { Input }
