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
  code: z.string().min(2, "Code is required").max(50),
  nameEn: z.string().min(2, "English name is required."),
  nameAr: z.string().min(2, "Arabic name is required."),
  contactPerson: z.string().min(2, "Contact Person is required."),
  email: z.string().email("Valid email required."),
  phone: z.string().min(5, "Valid phone number required."),
  taxNumber: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

export function SupplierForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nameEn: "",
      nameAr: "",
      contactPerson: "",
      email: "",
      phone: "",
      taxNumber: "",
      status: "ACTIVE",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      // API call placeholder
      console.log(values);
      await new Promise(r => setTimeout(r, 1000));
      router.push('/master-data/suppliers')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-4xl bg-surface-1 border border-border p-8 rounded-xl shadow-lg relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Supplier Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. V-001" className="bg-surface-2 font-mono uppercase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
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

          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem className="text-left">
                <FormLabel className="text-muted-foreground">Name (English)</FormLabel>
                <FormControl>
                  <Input placeholder="Global Distributors" className="bg-surface-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameAr"
            render={({ field }) => (
              <FormItem className="text-right" dir="rtl">
                <FormLabel className="text-muted-foreground">Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="الموزعون العالميون" className="bg-surface-2 text-right" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <h3 className="col-span-1 md:col-span-2 text-lg font-semibold border-b border-border pb-2 mt-4">Contact Information</h3>

          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Primary Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" className="bg-surface-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+966 50 000 0000" className="bg-surface-2" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="vendor@example.com" className="bg-surface-2" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">VAT / Tax Number</FormLabel>
                <FormControl>
                  <Input placeholder="Optional..." className="bg-surface-2 font-mono" {...field} />
                </FormControl>
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
            {isSubmitting ? "Saving..." : "Create Supplier"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
