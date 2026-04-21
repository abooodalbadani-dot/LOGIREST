"use client"

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Trash2, Plus } from "lucide-react"

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

const lineItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.preprocess((val) => Number(val), z.number().min(1, "Quantity must be at least 1")),
  estimatedUnitCost: z.preprocess((val) => Number(val), z.number().min(0, "Cost cannot be negative")),
  notes: z.string().optional(),
});

const formSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  expectedDate: z.string().min(1, "Expected Date is required"),
  notes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
});

export function PurchaseRequestForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
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

  // Calculate total whenever items change
  const items = form.watch("items");
  const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.estimatedUnitCost || 0)), 0);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      console.log("PR values:", values)
      await new Promise(r => setTimeout(r, 1000))
      router.push('/purchasing/purchase-requests')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full bg-surface-1 border border-border p-8 rounded-xl shadow-lg relative">
        <h3 className="text-xl font-bold mb-4">Request Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Branch</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="1">Riyadh Main Branch</SelectItem>
                    <SelectItem value="2">Jeddah Branch</SelectItem>
                  </SelectContent>
                </Select>
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

          <FormField
            control={form.control}
            name="notes"
            render={({ field }: { field: any }) => (
              <FormItem className="lg:col-span-3 text-left">
                <FormLabel className="text-muted-foreground">General Notes</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Urgent restock for weekend" className="bg-surface-2" {...field} />
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
              onClick={() => append({ itemId: "", quantity: 1, estimatedUnitCost: 0, notes: "" })}
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
                        <Input type="number" min="1" className="bg-surface-1 font-mono" {...inputField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.estimatedUnitCost`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Est. Unit Cost</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" className="bg-surface-1 font-mono" {...inputField} />
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
          
          <div className="mt-4 flex justify-end">
            <div className="bg-surface-2 px-6 py-3 rounded-lg border border-brand-primary/30 flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Estimated Total</span>
              <span className="text-2xl font-mono font-bold text-brand-primary">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(totalAmount)}
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
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
