"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
 return (
  <div
   data-slot="table-container"
   className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm"
  >
   <table
    data-slot="table"
    className={cn("w-full text-start border-collapse text-sm whitespace-nowrap", className)}
    {...props}
   />
  </div>
 )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
 return (
  <thead
   data-slot="table-header"
   className={cn("bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider", className)}
   {...props}
  />
 )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
 return (
  <tbody
   data-slot="table-body"
   className={cn(className)}
   {...props}
  />
 )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
 return (
  <tfoot
   data-slot="table-footer"
   className={cn(
    "bg-muted/30 font-medium border-t border-border",
    className
   )}
   {...props}
  />
 )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
 return (
  <tr
   data-slot="table-row"
   className={cn(
    "border-b border-border last:border-0 hover:bg-muted/50 transition-colors group",
    className
   )}
   {...props}
  />
 )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
 return (
  <th
   data-slot="table-head"
   className={cn(
    "px-6 py-4 font-medium text-start whitespace-nowrap [&:has([role=checkbox])]:pe-0",
    "first:sticky first:start-0 first:z-10 first:bg-card first:group-hover:bg-muted/50 first:transition-colors first:shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:first:shadow-[4px_0_12px_rgba(0,0,0,0.2)] rtl:first:shadow-[-4px_0_12px_rgba(0,0,0,0.03)] rtl:dark:first:shadow-[-4px_0_12px_rgba(0,0,0,0.2)] first:px-6 first:py-4",
    className
   )}
   {...props}
  />
 )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
 return (
  <td
   data-slot="table-cell"
   className={cn(
    "px-6 py-4 text-sm text-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0",
    "first:sticky first:start-0 first:z-10 first:bg-card first:group-hover:bg-muted/50 first:transition-colors first:shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:first:shadow-[4px_0_12px_rgba(0,0,0,0.2)] rtl:first:shadow-[-4px_0_12px_rgba(0,0,0,0.03)] rtl:dark:first:shadow-[-4px_0_12px_rgba(0,0,0,0.2)] first:px-6 first:py-4",
    className
   )}
   {...props}
  />
 )
}

function TableCaption({
 className,
 ...props
}: React.ComponentProps<"caption">) {
 return (
  <caption
   data-slot="table-caption"
   className={cn("mt-4 text-body-md text-muted-foreground", className)}
   {...props}
  />
 )
}

export {
 Table,
 TableHeader,
 TableBody,
 TableFooter,
 TableHead,
 TableRow,
 TableCell,
 TableCaption,
}
