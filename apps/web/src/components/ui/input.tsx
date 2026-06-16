import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps extends React.ComponentProps<"input"> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
 ({ className, type, dir, ...props }, ref) => {
  return (
   <InputPrimitive
    ref={ref}
    type={type}
    dir={dir ?? (type === "date" ? "ltr" : undefined)}
    data-slot="input"
    className={cn(
     "flex h-10 w-full rounded-md bg-transparent dark:bg-[#121212] border border-border px-4 py-2 text-sm text-text-main dark:text-white shadow-sm transition-colors duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-gold focus:border-brand-gold disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500",
     className
    )}
    {...props}
   />
  );
 }
);
Input.displayName = "Input";

export { Input }
