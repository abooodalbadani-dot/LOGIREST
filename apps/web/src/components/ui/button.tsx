import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius)] border-none bg-clip-padding text-body-md font-bold whitespace-nowrap transition-all duration-[140ms] ease-industrial outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
 {
 variants: {
 variant: {
 default: "bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] !text-white shadow-md shadow-primary/10 hover:opacity-90 hover:scale-[0.99] active:scale-[0.97] border-none",
 outline:
 "bg-surface-container-high text-foreground hover:bg-surface-container-highest hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
 secondary:
 "bg-secondary !text-white hover:bg-secondary/80 aria-expanded:bg-secondary active:scale-[0.98]",
 ghost:
 "hover:bg-muted text-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
 destructive:
 "bg-destructive !text-white hover:bg-destructive/90 active:scale-[0.98]",
 link: "text-primary underline-offset-4 hover:underline",
 },
 size: {
 default: "h-9 md:h-10 px-5 md:px-6 text-label-sm font-bold uppercase tracking-wider",
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
 ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
 const Comp = asChild ? Slot : ButtonPrimitive
 return (
 <Comp
 data-slot="button"
 className={cn(buttonVariants({ variant, size, className }))}
 {...props}
 />
 )
}

export { Button, buttonVariants }
