import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "group/button inline-flex shrink-0 items-center justify-center rounded-md border-none bg-clip-padding text-sm font-bold whitespace-nowrap transition-colors duration-200 outline-none select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-gold focus-visible:border-brand-gold disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-500 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
 {
 variants: {
 variant: {
 default: "bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] !text-white shadow-md shadow-primary/10 hover:opacity-90 hover:scale-[0.99] active:scale-[0.97] border-none",
 outline:
 "bg-transparent border border-gray-300 dark:border-neutral-700 text-text-main dark:text-gray-200 hover:bg-muted dark:hover:bg-neutral-800 h-10 px-4 rounded-md transition-colors focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus-visible:border-neutral-700",
 secondary:
 "bg-secondary !text-white hover:bg-secondary/80 aria-expanded:bg-secondary active:scale-[0.98]",
 ghost:
 "hover:bg-muted text-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
 destructive:
 "bg-red-600 hover:bg-red-700 !text-white font-medium h-10 px-4 rounded-md border-none hover:scale-[0.99] active:scale-[0.97]",
 link: "text-primary underline-offset-4 hover:underline",
 },
 size: {
 default: "h-10 px-6 text-sm font-bold uppercase tracking-wider",
 xs: "h-7 px-2 text-[10px] font-bold",
 sm: "h-8 md:h-9 px-3 md:px-4 text-label-xs font-bold",
 lg: "h-11 md:h-12 px-8 text-title-sm font-bold",
 icon: "h-9 w-9 md:h-10 md:w-10",
 "icon-xs": "h-6 w-6 md:h-7 md:w-7",
 "icon-sm": "h-8 w-8 md:h-9 md:w-9",
 "icon-lg": "h-11 w-11 md:h-12 md:w-12",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
)

function Button({
 className,
 variant = "default",
 size = "default",
 asChild = false,
 isLoading = false,
 disabled,
 children,
 ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { asChild?: boolean; isLoading?: boolean }) {
 const Comp = asChild ? Slot : ButtonPrimitive
 return (
 <Comp
 data-slot="button"
 className={cn(buttonVariants({ variant, size, className }))}
 disabled={disabled || isLoading}
 {...props}
 >
  {isLoading ? (
   <>
    <Loader2 className="w-4 h-4 animate-spin me-2 shrink-0" />
    {children}
   </>
  ) : (
   children
  )}
 </Comp>
 )
}

export { Button, buttonVariants }
