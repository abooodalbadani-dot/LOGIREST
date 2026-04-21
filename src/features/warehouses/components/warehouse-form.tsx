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
import { useBranches } from "@/features/branches/api/useBranches"
import { Skeleton } from "@/components/ui/skeleton"

const formSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").max(20),
  branchId: z.string().min(1, "Please select a branch."),
  nameEn: z.string().min(2, "English name is required."),
  nameAr: z.string().min(2, "Arabic name is required."),
  type: z.enum(["MAIN", "TRANSIT", "VIRTUAL"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

export function WarehouseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { data: branches, isLoading: branchesLoading } = useBranches()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      code: "",
      branchId: "",
      nameEn: "",
      nameAr: "",
      type: "MAIN",
      status: "ACTIVE",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      // API call placeholder
      console.log(values);
      await new Promise(r => setTimeout(r, 1000));
      router.push('/master-data/warehouses')
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
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Warehouse Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. WH-001" className="bg-surface-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Parent Branch</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={branchesLoading}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2">
                       {branchesLoading ? <Skeleton className="h-4 w-20" /> : <SelectValue placeholder="Select Branch" />}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
                    {branches?.map(branch => (
                       <SelectItem key={branch.id} value={branch.id}>{branch.nameEn}</SelectItem>
                    ))}
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
              <FormItem>
                <FormLabel className="text-muted-foreground">Name (English)</FormLabel>
                <FormControl>
                  <Input placeholder="Main Warehouse" className="bg-surface-2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameAr"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Name (Arabic)</FormLabel>
                <FormControl>
                  <Input placeholder="المستودع الرئيسي" className="bg-surface-2 text-right" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">Warehouse Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-2">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-2 border-border">
                    <SelectItem value="MAIN">Main</SelectItem>
                    <SelectItem value="TRANSIT">Transit Hub</SelectItem>
                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                  </SelectContent>
                </Select>
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
            className="bg-surface-1"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-brand-primary text-black hover:bg-brand-primary/90 shadow-[0_0_15px_rgba(58,190,255,0.5)]"
          >
            {isSubmitting ? "Saving..." : "Create Warehouse"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
