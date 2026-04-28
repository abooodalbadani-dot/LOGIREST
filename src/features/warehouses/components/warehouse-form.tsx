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
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useBranches } from "@/features/branches/api/useBranches"
import { Skeleton } from "@/components/ui/skeleton"

const formSchema = z.object({
  code: z.string().min(1).max(20),
  branchId: z.string().min(1),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  type: z.enum(["MAIN", "TRANSIT", "VIRTUAL"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

type WarehouseFormValues = z.infer<typeof formSchema>;
 
export function WarehouseForm() {
  const router = useRouter()
  const t = useTranslations("masterData.warehouses")
  const tc = useTranslations("masterData.common")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { data: branches, isLoading: branchesLoading } = useBranches()
 
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(formSchema),
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-4xl bg-surface-container-low border border-white/10 p-8 rounded-xl shadow-lg relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('code')}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. WH-001" className="bg-surface-container-medium" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('parent_branch')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={branchesLoading}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-container-medium">
                       {branchesLoading ? <Skeleton className="h-4 w-20" /> : <SelectValue placeholder={t('select_branch')} />}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-medium border-white/10">
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
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('name_en')}</FormLabel>
                <FormControl>
                  <Input placeholder="Main Warehouse" className="bg-surface-container-medium" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nameAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('name_ar')}</FormLabel>
                <FormControl>
                  <Input placeholder="المستودع الرئيسي" className="bg-surface-container-medium text-end" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('warehouse_type')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-container-medium">
                      <SelectValue placeholder={t('select_type')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-medium border-white/10">
                    <SelectItem value="MAIN">{t('type_main')}</SelectItem>
                    <SelectItem value="TRANSIT">Transit Hub</SelectItem>
                    <SelectItem value="VIRTUAL">{t('type_virtual')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('status')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-container-medium">
                      <SelectValue placeholder={t('select_status')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-medium border-white/10">
                    <SelectItem value="ACTIVE">{tc('active')}</SelectItem>
                    <SelectItem value="INACTIVE">{tc('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-white/10">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="bg-surface-container-low"
          >
            {tc('cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-primary text-black hover:bg-primary/90 shadow-[0_0_15px_rgba(58,190,255,0.5)]"
          >
            {isSubmitting ? tc('saving') : t('actions.create')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
