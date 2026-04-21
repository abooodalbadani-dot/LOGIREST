"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

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

const formSchema = z.object({
  sku: z.string().min(2, "SKU must be at least 2 characters").max(50),
  nameEn: z.string().min(2, "English name is required."),
  nameAr: z.string().min(2, "Arabic name is required."),
  category: z.enum(['FOOD', 'EQUIPMENT', 'PACKAGING', 'SUPPLIES']),
  uom: z.enum(['EA', 'KG', 'L', 'BOX', 'PACK']),
  minStockLevel: z.preprocess((val) => Number(val), z.number().min(0, "Cannot be negative")),
  costPrice: z.preprocess((val) => Number(val), z.number().min(0, "Cannot be negative")),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

export function ItemForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      sku: "",
      nameEn: "",
      nameAr: "",
      category: "FOOD",
      uom: "EA",
      minStockLevel: 0,
      costPrice: 0,
      status: "ACTIVE",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      // API call placeholder
      console.log(values);
      await new Promise(r => setTimeout(r, 1000));
      router.push('/master-data/items')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-5xl bg-surface-1 border border-border p-8 rounded-xl shadow-lg relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">SKU Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. SKU-1001" className="bg-surface-2 font-mono uppercase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="FOOD">Food & Ingredients</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                    <SelectItem value="PACKAGING">Packaging</SelectItem>
                    <SelectItem value="SUPPLIES">Supplies</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="uom"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Unit of Measure (UoM)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2">
                      <SelectValue placeholder="Select UoM" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="EA">Each (EA)</SelectItem>
                    <SelectItem value="KG">Kilogram (KG)</SelectItem>
                    <SelectItem value="L">Liter (L)</SelectItem>
                    <SelectItem value="BOX">Box (BOX)</SelectItem>
                    <SelectItem value="PACK">Pack (PACK)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }: { field: any }) => (
              <FormItem className="lg:col-span-2 text-left">
                <FormLabel className="text-muted-foreground">Name (English)</FormLabel>
                <FormControl>
                  <Input placeholder="Basmati Rice 5kg" className="bg-surface-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameAr"
            render={({ field }: { field: any }) => (
              <FormItem className="lg:col-span-2 text-right" dir="rtl">
                <FormLabel className="text-muted-foreground">Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="أرز بسمتي 5 كجم" className="bg-surface-2 text-right" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Base Unit Cost (SAR)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" className="bg-surface-2 font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minStockLevel"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Min Stock Level Target</FormLabel>
                <FormControl>
                  <Input type="number" className="bg-surface-2 font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse pt-6 mt-6 border-t border-border">
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
            {isSubmitting ? "Saving..." : "Create Item"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
