"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Switch } from "@/components/ui/switch"
import { useRouter } from '@/i18n/navigation'
import { useBranches } from "@/features/branches/hooks/useBranches"
import { type Branch, WarehouseFormSchema, type WarehouseFormValues } from "@/types/master-data"
import { Skeleton } from "@/components/ui/skeleton"

export function WarehouseForm() {
  const router = useRouter()
  const t = useTranslations("master_data.warehouses")
  const tc = useTranslations("common")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { data: branches, isLoading: branchesLoading } = useBranches()
  
  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(WarehouseFormSchema),
    defaultValues: {
      code: "",
      branch_id: "",
      name_en: "",
      name_ar: "",
      type: "main",
      is_active: true,
    },
  })

  async function onSubmit(values: WarehouseFormValues) {
    setIsSubmitting(true)
    try {
      // API call placeholder - in real usage this would be handled by a hook
      console.log('Submitting warehouse values:', values);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-4xl bg-surface-container-lowest p-8 rounded-2xl relative ambient-shadow">
        <h3 className="text-title-lg font-semibold mb-4 text-primary uppercase">{t('title')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('fields.code')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('code_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="branch_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('fields.branch')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={branchesLoading}>
                  <FormControl>
                    <SelectTrigger>
                      {branchesLoading ? <Skeleton className="h-4 w-20" /> : <SelectValue placeholder={t('select_branch')} />}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-low border-none">
                    {branches?.data?.map((branch: Branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('fields.name_en')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('name_en_placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('fields.name_ar')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('name_ar_placeholder')} className="text-end" dir="rtl" {...field} />
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
                <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('fields.type')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_type')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-low border-none">
                    {(['main', 'dry', 'cold', 'virtual', 'transit'] as const).map((type) => (
                      <SelectItem key={type} value={type}>{t(`types.${type}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg p-4 bg-surface-container-low">
                <div className="space-y-0.5">
                  <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('fields.is_active')}</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-12 mt-12">
          <Button 
            variant="ghost" 
            type="button" 
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-container-high px-8 h-12 rounded-xl font-bold hover:scale-[0.98] active:scale-95 transition-all"
          >
            {tc('actions.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:brightness-110 px-10 h-12 rounded-xl transition-all hover:scale-[0.98] active:scale-95 font-semibold uppercase text-label-xs"
          >
            {isSubmitting ? tc('actions.saving') : t('actions.create')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
