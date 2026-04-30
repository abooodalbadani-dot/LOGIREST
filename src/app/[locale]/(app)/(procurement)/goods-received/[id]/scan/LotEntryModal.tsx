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

interface LotFormValues {
  lotNumber: string;
  expiryDate: Date;
  receivedQuantity: number;
}

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

  const lotFormSchema = React.useMemo(() => z.object({
    lotNumber: z.string().min(1, t("lot_required")),
    expiryDate: z.date({
      required_error: t("expiry_required"),
    }),
    receivedQuantity: z.number().min(0.01, t("qty_greater_than_zero")),
  }), [t])

  type LotFormValues = z.infer<typeof lotFormSchema>

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
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
      <DialogContent className="sm:max-w-[425px] bg-surface-container-high border-none rounded-[2rem] shadow-2xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{t("lot_entry_title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground/60">
            {t("lot_entry_sub")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 rounded-2xl bg-primary/5 flex flex-col gap-1 border border-primary/10">
            <span className="text-xs font-black text-primary/60 uppercase tracking-widest">{common("item")}</span>
            <span className="font-black text-foreground">{itemName}</span>
            <span className="text-[10px] font-mono text-muted-foreground/40" dir="ltr">{itemBarcode}</span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="lotNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("lot_number")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. LOT-2024-001" 
                        {...field} 
                        className="bg-surface-container-medium border-none h-12 rounded-xl font-black focus-visible:ring-1 focus-visible:ring-primary/30"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-black" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("expiry_date")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-black h-12 bg-surface-container-medium border-none rounded-xl hover:bg-surface-container-highest transition-colors",
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
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            className="bg-surface-container-high"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-[10px] font-black" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="receivedQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("receiving_qty")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-surface-container-medium border-none h-12 rounded-xl font-black font-mono focus-visible:ring-1 focus-visible:ring-primary/30"
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-black" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  className="rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                  {common("cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="rounded-xl font-black text-[10px] uppercase tracking-widest min-w-[120px]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("confirm_lot")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
