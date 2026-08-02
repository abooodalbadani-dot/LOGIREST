"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
 className,
 classNames,
 showOutsideDays = true,
 locale,
 ...props
}: CalendarProps) {
 return (
 <DayPicker
 locale={locale || enUS}
 dir="ltr"
 lang="en"
 showOutsideDays={showOutsideDays}
 className={cn("p-4 bg-card border border-border shadow-sm rounded-lg border border-primary/5 shadow-xl animate-in fade-in zoom-in-95 duration-200 force-latin-numbers font-mono", className)}
 classNames={{
 months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
 month: "space-y-4",
 month_caption: "flex justify-between pt-1 relative items-center px-2",
 caption_label: "text-label-xs font-semibold uppercase text-primary/40",
 nav: "flex items-center gap-1",
 button_previous: cn(
 buttonVariants({ variant: "ghost", size: "icon-xs" }),
 "h-8 w-8 rounded-lg hover:bg-primary/5 p-0"
 ),
 button_next: cn(
 buttonVariants({ variant: "ghost", size: "icon-xs" }),
 "h-8 w-8 rounded-lg hover:bg-primary/5 p-0"
 ),
 month_grid: "w-full border-collapse",
 weekdays: "flex",
 weekday:
 "text-muted-foreground rounded-lg w-9 font-semibold text-label-xs uppercase h-9 flex items-center justify-center opacity-40",
 week: "flex w-full mt-1",
 day: "h-9 w-9 text-center text-body-md p-0 relative focus-within:relative focus-within:z-20",
 day_button: cn(
 buttonVariants({ variant: "ghost", size: "sm" }),
 "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-lg hover:bg-primary/10 hover:text-primary"
 ),
 selected:
 "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
 today: "bg-accent text-accent-foreground",
 outside:
 "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
 disabled: "text-muted-foreground opacity-50",
 hidden: "invisible",
 ...classNames,
 }}
 components={{
 Chevron: ({ orientation }) => {
 if (orientation === "left") {
 return <ChevronLeft className="h-4 w-4 text-primary" />
 }
 return <ChevronRight className="h-4 w-4 text-primary" />
 },
 }}
 {...props}
 />
 )
}
Calendar.displayName = "Calendar"

export { Calendar }
