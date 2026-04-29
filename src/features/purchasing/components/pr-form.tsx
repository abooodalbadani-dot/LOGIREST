"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Trash2, Plus, Calendar, FileText, Package, Calculator, ArrowLeft, Send } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

const lineItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  estimatedUnitCost: z.number().min(0, "Cost cannot be negative"),
  notes: z.string().optional(),
});

const formSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  expectedDate: z.string().min(1, "Expected Date is required"),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
});

type PurchaseRequestFormValues = z.infer<typeof formSchema>;

export function PurchaseRequestForm() {
  const t = useTranslations("procurement.pr");
  const tc = useTranslations("common");
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<PurchaseRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branchId: "",
      expectedDate: "",
      notes: "",
      items: [{ itemId: "", quantity: 1, estimatedUnitCost: 0, notes: "" }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.estimatedUnitCost || 0)), 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      console.log("PR values:", values)
      await new Promise(r => setTimeout(r, 1000))
      router.push('/purchase-requests')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 w-full bg-surface-container-lowest p-8 rounded-[2rem] relative pb-20">
        <h3 className="text-xl font-black mb-4 text-operational-cyan uppercase tracking-wider">{t('title')}</h3>
        
        {/* Step 1: Request Header */}
        <div className="bg-surface-container-low p-8 rounded-3xl relative">
          <div className="flex items-center gap-4 mb-8 pb-6">
             <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan">
                <FileText className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Request Configuration</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">Define origin and scheduling</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FormField<PurchaseRequestFormValues, "branchId">
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-2">
                    <Package className="w-3 h-3" />
                    Target Branch
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-surface-container-high/30 border-none h-12 px-5 text-[11px] font-bold rounded-xl">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface-container-highest border-none rounded-xl">
                      <SelectItem value="1" className="text-[11px] font-bold">Riyadh Main Kitchen</SelectItem>
                      <SelectItem value="2" className="text-[11px] font-bold">Jeddah Coastal Branch</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />

            <FormField<PurchaseRequestFormValues, "expectedDate">
              control={form.control}
              name="expectedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Expected Arrival
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="bg-surface-container-high/30 border-none h-12 px-5 text-[11px] font-bold rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />

            <FormField<PurchaseRequestFormValues, "notes">
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="lg:col-span-3">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Workflow Narrative / Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Urgent restock for upcoming banquet event..." className="bg-surface-container-high/30 border-none h-12 px-5 text-[11px] font-bold rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage className="text-[9px] font-black uppercase" />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Step 2: Line Items */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
               <div className="p-2.5 rounded-xl bg-status-warning/10 text-status-warning">
                  <Calculator className="w-4 h-4" />
               </div>
               <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">Line Item Manifest</h3>
                  <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-0.5">Add items to be fulfilled</p>
               </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-10 px-6 border-operational-cyan/30 text-operational-cyan bg-operational-cyan/5 hover:bg-operational-cyan hover:text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              onClick={() => append({ itemId: "", quantity: 1, estimatedUnitCost: 0, notes: "" })}
            >
              <Plus className="h-3.5 w-3.5 me-2" />
              Add Component
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-6 items-end bg-surface-container-low/50 p-6 rounded-2xl group hover:bg-surface-container transition-all">
                <FormField<PurchaseRequestFormValues, `items.${number}.itemId`>
                  control={form.control}
                  name={`items.${index}.itemId`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Item Identity / SKU</FormLabel>
                      <FormControl>
                         <Input placeholder="e.g. IT-001" className="bg-surface-container-high/30 border-none h-11 px-4 text-[11px] font-bold rounded-lg font-mono uppercase tracking-widest" {...inputField} />
                      </FormControl>
                      <FormMessage className="text-[8px] font-black" />
                    </FormItem>
                  )}
                />

                <FormField<PurchaseRequestFormValues, `items.${number}.quantity`>
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          className="bg-surface-container-high/30 border-none h-11 px-4 text-[11px] font-bold rounded-lg font-mono" 
                          {...inputField} 
                          onChange={(e) => inputField.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<PurchaseRequestFormValues, `items.${number}.estimatedUnitCost`>
                  control={form.control}
                  name={`items.${index}.estimatedUnitCost`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Est. Unit Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="bg-surface-container-high/30 border-none h-11 px-4 text-[11px] font-bold rounded-lg font-mono" 
                          {...inputField} 
                          onChange={(e) => inputField.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField<PurchaseRequestFormValues, `items.${number}.notes`>
                  control={form.control}
                  name={`items.${index}.notes`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Line Context</FormLabel>
                      <FormControl>
                        <Input placeholder="Specific usage notes..." className="bg-surface-container-high/30 border-none h-11 px-4 text-[11px] font-bold rounded-lg" {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="w-10 h-10 rounded-xl text-muted-foreground/20 hover:text-status-error hover:bg-status-error/10 transition-all"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Summary Calculations */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-surface-container-low rounded-2xl">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 flex items-center justify-center">
                   <Package className="w-6 h-6 text-operational-cyan" />
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Item Aggregation</div>
                   <div className="text-sm font-bold text-foreground">{fields.length} Unique Components Selected</div>
                </div>
             </div>
             
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-1">Estimated Total Commitment</span>
                <div className="flex items-baseline gap-2">
                   <span className="text-4xl font-black tracking-tighter tabular-nums text-foreground">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(totalAmount)}
                   </span>
                   <span className="text-sm font-black text-operational-cyan uppercase tracking-widest">SAR</span>
                </div>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-12 mt-12">
           <Button
            variant="ghost"
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-surface-container-high h-12 px-8 rounded-xl transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 me-2" />
            Discard Request
          </Button>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
             <Button
                type="button"
                variant="outline"
                className="flex-1 md:flex-none h-12 px-8 border-surface-container-high text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-high"
             >
                Save Draft
             </Button>
             <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 md:flex-none h-12 px-10 bg-operational-cyan hover:brightness-110 text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95"
             >
                {isSubmitting ? "Processing..." : (
                  <>
                    <Send className="w-3.5 h-3.5 me-2" />
                    Dispatch Request
                  </>
                )}
              </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
