"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover"
import { onFormError } from "@/hooks/useFormError"

const _lotFormSchema = z.object({
 lotNumber: z.string().min(1, "lot_required"),
 expiryDate: z.date({
 message: "expiry_required",
 }),
 receivedQuantity: z.number().min(0.01, "qty_greater_than_zero"),
})

export type LotFormValues = z.infer<typeof _lotFormSchema>

interface LotEntryModalProps {
 isOpen: boolean
 onClose: () => void
 onConfirm: (values: LotFormValues) => void
 itemName: string
 itemBarcode: string
 isSubmitting?: boolean
}

export function LotEntryModal({
 isOpen,
 onClose,
 onConfirm,
 itemName,
 itemBarcode,
 isSubmitting = false,
}: LotEntryModalProps) {
 const t = useTranslations("procurement.grn")
 const common = useTranslations("common")

 const localizedSchema = React.useMemo(() => z.object({
 lotNumber: z.string().min(1, t("lot_required")),
 expiryDate: z.date({
 message: t("expiry_required"),
 }),
 receivedQuantity: z.number().min(0.01, t("qty_greater_than_zero")),
 }), [t])

 const form = useForm<LotFormValues>({
 resolver: zodResolver(localizedSchema),
 defaultValues: {
 lotNumber: "",
 receivedQuantity: 1,
 },
 })

 // Reset form when modal opens with new item
 React.useEffect(() => {
 if (isOpen) {
 form.reset({
 lotNumber: "",
 receivedQuantity: 1,
 })
 }
 }, [isOpen, form])

 const onSubmit = (values: LotFormValues) => {
 onConfirm(values)
 }

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="w-full inset-x-0 bottom-0 sm:bottom-auto mb-0 sm:mb-auto sm:max-w-[425px] bg-white dark:bg-card border border-gray-200 dark:border-gray-800 rounded-t-[2rem] sm:rounded-b-[2rem] rounded-b-none shadow-2xl p-4 sm:p-8">
 <DialogHeader>
 <DialogTitle className="text-title-lg font-semibold">{t("lot_entry_title")}</DialogTitle>
 <DialogDescription className="text-muted-foreground/60">
 {t("lot_entry_sub")}
 </DialogDescription>
 </DialogHeader>

 <div className="py-4 space-y-4">
 <div className="p-4 rounded-2xl bg-primary/5 flex flex-col gap-1 border border-primary/10">
 <span className="text-label-sm font-semibold text-primary/60 uppercase">{common("item")}</span>
 <span className="font-semibold text-foreground">{itemName}</span>
 <span className="text-label-xs font-mono text-muted-foreground/40" dir="ltr">{itemBarcode}</span>
 </div>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-4">
 <FormField
 control={form.control}
 name="lotNumber"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t("lot_number")}</FormLabel>
 <FormControl>
 <Input 
 placeholder={common("placeholders.lot_number")} 
 {...field} 
 className="bg-surface-container-medium border-none h-12 rounded-xl font-semibold focus-visible:ring-1 focus-visible:ring-primary/30"
 />
 </FormControl>
 <FormMessage className="text-label-xs font-semibold" />
 </FormItem>
 )}
 />

 <div className="grid grid-cols-2 gap-4">
 <FormField
 control={form.control}
 name="expiryDate"
 render={({ field }) => (
 <FormItem className="flex flex-col">
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t("expiry_date")}</FormLabel>
 <Popover>
 <PopoverTrigger asChild>
 <FormControl>
 <Button
 variant={"outline"} className={cn(
 "w-full pl-3 text-left font-semibold h-12 bg-surface-container-medium border-none rounded-xl hover:bg-surface-container-highest transition-colors",
 !field.value && "text-muted-foreground"
 )}
 >
 {field.value ? (
 format(field.value, "PPP")
 ) : (
 <span>{common("select_date")}</span>
 )}
 <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
 </Button>
 </FormControl>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl" align="start">
 <Calendar
 mode="single"
 selected={field.value}
 onSelect={(date: Date | undefined) => field.onChange(date)}
 disabled={(date: Date) =>
 date < new Date(new Date().setHours(0, 0, 0, 0))
 }
 initialFocus
 className="bg-surface-container-high"
 />
 </PopoverContent>
 </Popover>
 <FormMessage className="text-label-xs font-semibold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="receivedQuantity"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t("receiving_qty")}</FormLabel>
 <FormControl>
 <Input 
 type="number" 
 step="0.01"
 {...field}
 onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
 className="bg-surface-container-medium border-none h-12 rounded-xl font-semibold font-mono focus-visible:ring-1 focus-visible:ring-primary/30"
 dir="ltr"
 />
 </FormControl>
 <FormMessage className="text-label-xs font-semibold" />
 </FormItem>
 )}
 />
 </div>

 <DialogFooter className="pt-4">
 <Button 
 type="button" 
 variant="ghost" 
 onClick={onClose}
 className="rounded-xl font-semibold text-label-xs uppercase"
 >
 {common("cancel")}
 </Button>
 <Button 
 type="submit" 
 isLoading={isSubmitting}
 className="rounded-xl font-semibold text-label-xs uppercase min-w-[120px]"
 >
 {t("confirm_lot")}
 </Button>
 </DialogFooter>
 </form>
 </Form>
 </div>
 </DialogContent>
 </Dialog>
 )
}
