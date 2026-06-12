import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.ComponentProps<"input"> {}

function Input({ className, type, dir, ...props }: InputProps) {
 return (
 <InputPrimitive
 type={type}
 dir={dir ?? (type === "date" ? "ltr" : undefined)}
 data-slot="input"
 className={cn(
 "h-12 w-full rounded-[var(--radius)] border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-surface-container-lowest shadow-sm px-4 py-2 text-body-md text-foreground transition-all duration-[140ms] ease-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-body-md file:font-medium file:text-foreground placeholder:text-muted-foreground/50 hover:border-slate-400 dark:hover:border-slate-500 focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:border-primary focus-visible:shadow-md focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:bg-destructive/5",
 className
 )}
 {...props}
 />
 )
}

export { Input }
