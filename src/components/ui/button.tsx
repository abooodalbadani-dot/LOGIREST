import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius)] border border-transparent bg-clip-padding text-body-md font-medium whitespace-nowrap transition-all duration-[140ms] ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
 {
 variants: {
 variant: {
 default: "bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-primary-foreground shadow-sm hover:opacity-90 hover:scale-[0.995] active:scale-[0.97]",
 outline:
 "border-border-surface bg-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
 secondary:
 "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
 ghost:
 "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
 destructive:
 "bg-destructive text-destructive-foreground hover:bg-destructive/90",
 link: "text-primary underline-offset-4 hover:underline",
 },
 size: {
 default: "h-12 px-8 py-2 text-label-xs font-semibold uppercase",
 xs: "h-7 px-2 text-label-sm",
 sm: "h-10 px-4",
 lg: "h-14 px-10",
 icon: "h-12 w-12",
 "icon-xs": "h-7 w-7",
 "icon-sm": "h-10 w-10",
 "icon-lg": "h-14 w-14",
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
