"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const lineItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  notes: z.string().optional(),
});

const formSchema = z.object({
  supplierId: z.string().min(1),
  prId: z.string().optional(),
  supplierCurrency: z.string().min(1),
  exchangeRate: z.number().min(0.0001),
  expectedDate: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1),
});

type PurchaseOrderFormValues = z.infer<typeof formSchema>;

export function PurchaseOrderForm({ defaultCurrency = "SAR", initialRate = 1 }) {
  const router = useRouter();
  const t = useTranslations("purchasing.po");
  const tc = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: "",
      prId: "",
      supplierCurrency: defaultCurrency,
      exchangeRate: initialRate,
      expectedDate: "",
      notes: "",
      items: [{ itemId: "", quantity: 1, unitPrice: 0, notes: "" }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const currency = form.watch("supplierCurrency");
  const rate = form.watch("exchangeRate");

  const supplierTotalAmount = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  const baseTotalAmount = supplierTotalAmount * (rate || 1);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      console.log("PO values:", values);
      await new Promise(r => setTimeout(r, 1000));
      router.push('/purchasing/po');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full bg-surface-container-lowest p-8 rounded-[2rem] relative">
        <h3 className="text-xl font-black mb-4 text-operational-cyan uppercase tracking-wider">{t('title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-[10px] uppercase tracking-widest font-bold">{t('supplier')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-container-low border-none h-11 rounded-xl">
                      <SelectValue placeholder={t('select_supplier')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-low border-none rounded-xl">
                    <SelectItem value="SUP-01">Al Marai Fresh (SUP-01)</SelectItem>
                    <SelectItem value="SUP-02">Global Equipments (SUP-02)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-[10px] uppercase tracking-widest font-bold">{t('linked_pr')}</FormLabel>
                <FormControl>
                  <Input placeholder="PR-2026-001" className="bg-surface-container-low uppercase font-mono border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-[10px] uppercase tracking-widest font-bold">{t('expected_date')}</FormLabel>
                <FormControl>
                  <Input type="date" className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <FormField
            control={form.control}
            name="supplierCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-[10px] uppercase tracking-widest font-bold">{t('supplier_currency')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-container-low border-none font-mono h-11 rounded-xl">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-low border-none rounded-xl">
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="exchangeRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-[10px] uppercase tracking-widest font-bold">{t('fx_rate')}</FormLabel>
                <div className="relative">
                  <ArrowRightLeft className="absolute start-3 top-3.5 h-4 w-4 text-muted-foreground/40" />
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.0001" 
                      min="0" 
                      className="bg-surface-container-low border-none h-11 ps-10 rounded-xl focus-visible:ring-operational-cyan/30" 
                      dir="ltr" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-3 text-start">
                <FormLabel className="text-muted-foreground/60 text-[10px] uppercase tracking-widest font-bold">{t('general_notes')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('notes_placeholder')} className="bg-surface-container-low border-none h-11 rounded-xl focus-visible:ring-operational-cyan/30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-pulse" />
              {t('line_items')}
            </h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="border-operational-cyan/20 text-operational-cyan hover:bg-operational-cyan/10 transition-all rounded-xl font-bold hover:scale-[0.98] active:scale-95"
              onClick={() => append({ itemId: "", quantity: 1, unitPrice: 0, notes: "" })}
            >
              <Plus className="h-4 w-4 me-2" />
              {t('add_item')}
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 items-end bg-surface-container-high/20 p-6 rounded-2xl border-none transition-all hover:bg-surface-container-high/30 group">
                <FormField
                  control={form.control}
                  name={`items.${index}.itemId`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">{t('item_sku')}</FormLabel>
                      <FormControl>
                         <Input placeholder="IT-1" className="bg-surface-container-low font-mono uppercase border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">{t('quantity')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          className="bg-surface-container-low font-mono border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" 
                          dir="ltr" 
                          {...inputField} 
                          onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">{t('unit_price')} ({currency})</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          className="bg-surface-container-low font-mono border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" 
                          dir="ltr" 
                          {...inputField} 
                          onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.notes`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">{t('line_notes')}</FormLabel>
                      <FormControl>
                        <Input placeholder="..." className="bg-surface-container-low border-none h-10 rounded-lg focus-visible:ring-operational-cyan/30" {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="mb-[2px] text-muted-foreground/50 hover:text-status-error hover:bg-status-error/10 h-10 w-10 transition-colors rounded-lg"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-10 flex flex-col md:flex-row justify-end gap-6">
            <div className="bg-surface-container-high/30 px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px]">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">{t('supplier_total')}</span>
              <span className="text-xl font-mono font-black text-foreground" dir="ltr">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(supplierTotalAmount)}
              </span>
            </div>
            <div className="bg-surface-container-highest/50 px-8 py-5 rounded-2xl border-none flex items-center justify-between gap-10 min-w-[300px] backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 start-0 w-1 h-full bg-operational-cyan" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-operational-cyan/80">{t('base_total')}</span>
              <span className="text-2xl font-mono font-black text-operational-cyan" dir="ltr">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(baseTotalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-12 mt-12">
          <Button
            variant="ghost"
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-container-high px-8 h-12 rounded-xl font-bold hover:scale-[0.98] active:scale-95 transition-all"
          >
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-operational-cyan text-primary-foreground hover:brightness-110 px-10 h-12 rounded-xl transition-all hover:scale-[0.98] active:scale-95 font-black uppercase tracking-widest text-[10px]"
          >
            {isSubmitting ? t('actions.submitting') : t('actions.submit')}
          </Button>
        </div>

      </form>
    </Form>
  );
}
