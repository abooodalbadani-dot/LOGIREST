"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
 return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
 asChild,
 ...props
}: DialogPrimitive.Trigger.Props & { asChild?: boolean }) {
 if (asChild) {
 const { children, ...rest } = props
 return (
 <DialogPrimitive.Trigger
 data-slot="dialog-trigger"
 render={children as React.ReactElement}
 {...rest}
 />
 )
 }
 return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
 return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
 return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
 className,
 ...props
}: DialogPrimitive.Backdrop.Props) {
 return (
 <DialogPrimitive.Backdrop
 data-slot="dialog-overlay"
 className={cn(
 "fixed inset-0 isolate z-50 bg-black/40 duration-100 backdrop-blur-[12px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
 className
 )}
 {...props}
 />
 )
}

function DialogContent({
 className,
 children,
 showCloseButton = true,
 ...props
}: DialogPrimitive.Popup.Props & {
 showCloseButton?: boolean
}) {
 return (
 <DialogPortal>
 <DialogOverlay />
 <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 sm:p-0">
 <DialogPrimitive.Popup
 data-slot="dialog-content"
 className={cn(
 "pointer-events-auto grid w-full gap-4 rounded-xl bg-surface-container-lowest p-4 text-body-md text-foreground ambient-shadow duration-100 outline-none border border-border-surface max-w-lg mx-auto data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
 className
 )}
 {...props}
 >
 {children}
 {showCloseButton && (
 <DialogPrimitive.Close
 data-slot="dialog-close"
 render={
 <Button
 variant="ghost"
 className="absolute top-2 inset-inline-end-2 text-muted-foreground hover:text-foreground"
 size="icon-sm"
 />
 }
 >
 <XIcon
 />
 <span className="sr-only">Close</span>
 </DialogPrimitive.Close>
 )}
 </DialogPrimitive.Popup>
 </div>
 </DialogPortal>
 )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="dialog-header"
 className={cn("flex flex-col gap-2", className)}
 {...props}
 />
 )
}

function DialogFooter({
 className,
 showCloseButton = false,
 children,
 ...props
}: React.ComponentProps<"div"> & {
 showCloseButton?: boolean
}) {
 return (
 <div
 data-slot="dialog-footer"
 className={cn(
 "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl bg-surface-container-lowest/50 p-4 sm:flex-row sm:justify-end border-t border-border-surface",
 className
 )}
 {...props}
 >
 {children}
 {showCloseButton && (
 <DialogPrimitive.Close render={<Button variant="outline" />}>
 Close
 </DialogPrimitive.Close>
 )}
 </div>
 )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
 return (
 <DialogPrimitive.Title
 data-slot="dialog-title"
 className={cn(
 "font-heading text-title-sm leading-none font-medium",
 className
 )}
 {...props}
 />
 )
}

function DialogDescription({
 className,
 ...props
}: DialogPrimitive.Description.Props) {
 return (
 <DialogPrimitive.Description
 data-slot="dialog-description"
 className={cn(
 "text-body-md text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
 className
 )}
 {...props}
 />
 )
}

export {
 Dialog,
 DialogClose,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogOverlay,
 DialogPortal,
 DialogTitle,
 DialogTrigger,
}
