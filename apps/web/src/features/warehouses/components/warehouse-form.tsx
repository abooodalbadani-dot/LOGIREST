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
import { useRouter } from '@/i18n/navigation'
import { useBranches } from "@/features/branches/hooks/useBranches"
import { type Branch } from "@/types/master-data"
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
 const t = useTranslations("master_data.warehouses")
 const tc = useTranslations("master_data.common")
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
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-4xl bg-surface-container-lowest p-8 rounded-2xl relative">
 <h3 className="text-title-lg font-semibold mb-4 text-operational-cyan uppercase">{t('title')}</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="code"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('code')}</FormLabel>
 <FormControl>
 <Input placeholder={t('code_placeholder')} {...field} />
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('parent_branch')}</FormLabel>
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
 name="nameEn"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('name_en')}</FormLabel>
 <FormControl>
 <Input placeholder={t('name_en_placeholder')} {...field} />
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('name_ar')}</FormLabel>
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('warehouse_type')}</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder={t('select_type')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none">
 <SelectItem value="MAIN">{t('type_main')}</SelectItem>
 <SelectItem value="TRANSIT">{t('type_transit')}</SelectItem>
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('status')}</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder={t('select_status')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none">
 <SelectItem value="ACTIVE">{tc('active')}</SelectItem>
 <SelectItem value="INACTIVE">{tc('inactive')}</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage />
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
 {tc('cancel')}
 </Button>
 <Button 
 type="submit" 
 disabled={isSubmitting}
 className="bg-operational-cyan text-primary-foreground hover:brightness-110 px-10 h-12 rounded-xl transition-all hover:scale-[0.98] active:scale-95 font-semibold uppercase text-label-xs"
 >
 {isSubmitting ? tc('saving') : t('actions.create')}
 </Button>
 </div>
 </form>
 </Form>
 )
}
