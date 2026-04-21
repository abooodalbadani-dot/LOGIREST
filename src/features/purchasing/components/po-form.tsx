"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Plus, ArrowRightLeft } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const lineItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.preprocess((val) => Number(val), z.number().min(1, "Quantity must be at least 1")),
  unitPrice: z.preprocess((val) => Number(val), z.number().min(0, "Price cannot be negative")),
  notes: z.string().optional(),
});

const formSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  prId: z.string().optional(),
  supplierCurrency: z.string().min(1, "Currency is required"),
  exchangeRate: z.preprocess((val) => Number(val), z.number().min(0.0001, "Exchange rate is required")),
  expectedDate: z.string().min(1, "Expected Date is required"),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
});

export function PurchaseOrderForm({ defaultCurrency = "SAR", initialRate = 1 }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full bg-surface-1 border border-border p-8 rounded-xl shadow-lg relative">
        <h3 className="text-xl font-bold mb-4 text-brand-primary">Purchase Order Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Supplier</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2 border-border">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
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
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Linked PR (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. PR-2026-001" className="bg-surface-2 uppercase font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedDate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Expected Delivery Date</FormLabel>
                <FormControl>
                  <Input type="date" className="bg-surface-2" {...field} />
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
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Supplier Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2 border-border font-mono">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
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
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">FX Rate (to SAR)</FormLabel>
                <div className="relative">
                  <ArrowRightLeft className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input type="number" step="0.0001" min="0" className="bg-surface-2 pl-9 font-mono" dir="ltr" {...field} />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="notes"
            render={({ field }: { field: any }) => (
              <FormItem className="md:col-span-3 text-left">
                <FormLabel className="text-muted-foreground">General Notes</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Special packaging required" className="bg-surface-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="pt-6 border-t border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Line Items</h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="border-brand-primary text-brand-primary hover:bg-brand-primary/10"
              onClick={() => append({ itemId: "", quantity: 1, unitPrice: 0, notes: "" })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 items-end bg-surface-2 p-4 rounded-lg border border-border">
                <FormField
                  control={form.control}
                  name={`items.${index}.itemId`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Item SKU</FormLabel>
                      <FormControl>
                         <Input placeholder="e.g. IT-1" className="bg-surface-1 font-mono uppercase" {...inputField} />
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
                      <FormLabel className="text-xs text-muted-foreground">Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" className="bg-surface-1 font-mono" dir="ltr" {...inputField} />
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
                      <FormLabel className="text-xs text-muted-foreground">Unit Price ({currency})</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" className="bg-surface-1 font-mono" dir="ltr" {...inputField} />
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
                      <FormLabel className="text-xs text-muted-foreground">Line Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional..." className="bg-surface-1" {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="mb-[2px] text-muted-foreground hover:text-neon-error hover:bg-neon-error/10"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex flex-col md:flex-row justify-end gap-4">
            <div className="bg-surface-2 px-6 py-4 rounded-lg border border-border flex items-center justify-between gap-6 min-w-[250px]">
              <span className="text-sm text-muted-foreground">Supplier Total</span>
              <span className="text-xl font-mono font-bold text-foreground" dir="ltr">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(supplierTotalAmount)}
              </span>
            </div>
            <div className="bg-surface-2 px-6 py-4 rounded-lg border border-brand-primary/50 flex items-center justify-between gap-6 min-w-[250px]">
              <span className="text-sm text-brand-primary/80">Base Total</span>
              <span className="text-2xl font-mono font-bold text-brand-primary" dir="ltr">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(baseTotalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-6 mt-6 border-t border-border">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="bg-surface-1 text-foreground border-border hover:bg-surface-2"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-primary text-black hover:bg-brand-primary/90 shadow-[0_0_15px_rgba(58,190,255,0.5)]"
          >
            {isSubmitting ? "Submitting..." : "Submit PO"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
