"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

function PopoverTrigger({
 asChild,
 ...props
}: PopoverPrimitive.Trigger.Props & { asChild?: boolean }) {
 if (asChild) {
 const { children, ...rest } = props
 return (
 <PopoverPrimitive.Trigger
 data-slot="popover-trigger"
 render={children as React.ReactElement}
 {...rest}
 />
 )
 }
 return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
 className,
 align = "center",
 sideOffset = 4,
 alignOffset,
 side,
 ...props
}: PopoverPrimitive.Popup.Props &
 Pick<
 PopoverPrimitive.Positioner.Props,
 "align" | "alignOffset" | "side" | "sideOffset"
 >) {
 return (
 <PopoverPrimitive.Portal>
 <PopoverPrimitive.Positioner
 align={align}
 sideOffset={sideOffset}
 alignOffset={alignOffset}
 side={side}
 >
 <PopoverPrimitive.Popup
 className={cn(
 "z-50 w-72 rounded-lg bg-surface-container-lowest p-4 text-foreground ambient-shadow outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2",
 className
 )}
 {...props}
 />
 </PopoverPrimitive.Positioner>
 </PopoverPrimitive.Portal>
 )
}

export { Popover, PopoverTrigger, PopoverContent }
