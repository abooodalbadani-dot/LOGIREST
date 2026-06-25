"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
 return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
 return (
 <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
 )
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
 return (
 <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
 )
}

function AlertDialogOverlay({
 className,
 ...props
}: AlertDialogPrimitive.Backdrop.Props) {
 return (
 <AlertDialogPrimitive.Backdrop
 data-slot="alert-dialog-overlay"
 className={cn(
 "fixed inset-0 isolate z-50 bg-black/40 duration-100 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogContent({
 className,
 size = "default",
 ...props
}: AlertDialogPrimitive.Popup.Props & {
 size?: "default" | "sm"
}) {
 return (
 <AlertDialogPortal>
 <AlertDialogOverlay />
 <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 sm:p-0">
 <AlertDialogPrimitive.Popup
 data-slot="alert-dialog-content"
 data-size={size}
 className={cn(
 "pointer-events-auto group/alert-dialog-content grid w-full gap-4 bg-white dark:bg-[#1A2234] border border-gray-200 dark:border-gray-800 shadow-2xl sm:rounded-xl p-6 text-foreground ambient-shadow duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 will-change-[transform,opacity]",
 className
 )}
 {...props}
 />
 </div>
 </AlertDialogPortal>
 )
}

function AlertDialogHeader({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="alert-dialog-header"
 className={cn(
 "flex flex-col gap-1.5 text-start",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogFooter({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="alert-dialog-footer"
 className={cn(
 "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 mt-6 pt-4 border-t border-gray-100 ",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogMedia({
 className,
 ...props
}: React.ComponentProps<"div">) {
 return (
 <div
 data-slot="alert-dialog-media"
 className={cn(
 "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-surface-container-high sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogTitle({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
 return (
 <AlertDialogPrimitive.Title
 data-slot="alert-dialog-title"
 className={cn(
 "font-heading text-title-sm font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogDescription({
 className,
 ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
 return (
 <AlertDialogPrimitive.Description
 data-slot="alert-dialog-description"
 className={cn(
 "text-body-md text-balance text-[#b48e67] font-medium md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
 className
 )}
 {...props}
 />
 )
}

function AlertDialogAction({
 className,
 ...props
}: React.ComponentProps<typeof Button>) {
 return (
 <Button
 data-slot="alert-dialog-action"
 className={cn(className)}
 {...props}
 />
 )
}

function AlertDialogCancel({
 className,
 variant = "outline",
 size = "default",
 ...props
}: AlertDialogPrimitive.Close.Props &
 React.ComponentProps<typeof Button>) {
 return (
 <AlertDialogPrimitive.Close
 data-slot="alert-dialog-cancel"
 className={cn(className)}
 render={<Button variant={variant} size={size} />}
 {...props}
 />
 )
}

export {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogMedia,
 AlertDialogOverlay,
 AlertDialogPortal,
 AlertDialogTitle,
 AlertDialogTrigger,
}
