"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { useRouter } from '@/i18n/navigation'
import { CreateBranchDTO } from "../types"

const formSchema = z.object({
 code: z.string().min(2, "Code must be at least 2 characters").max(20),
 nameEn: z.string().min(2, "English name is required."),
 nameAr: z.string().min(2, "Arabic name is required."),
 status: z.enum(["ACTIVE", "INACTIVE"]),
})

export function BranchForm() {
 const router = useRouter()
 const [isSubmitting, setIsSubmitting] = React.useState(false)
 const t = useTranslations("common");
 const tb = useTranslations("master_data.branches");

 const form = useForm<z.infer<typeof formSchema>>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 code: "",
 nameEn: "",
 nameAr: "",
 status: "ACTIVE",
 },
 })

 async function onSubmit(values: z.infer<typeof formSchema>) {
 setIsSubmitting(true)
 try {
 // API call placeholder
 console.log(values);
 await new Promise(r => setTimeout(r, 1000));
 router.push('/master-data/branches')
 } catch (error) {
 console.error(error)
 } finally {
 setIsSubmitting(false)
 }
 }

 return (
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-4xl bg-surface-container-lowest ambient-shadow p-8 rounded-2xl relative overflow-hidden">
 {/* Visual Accent */}
 <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-operational-cyan/30 to-transparent" />

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <FormField
 control={form.control}
 name="code"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-label-xs font-bold uppercase text-muted-foreground/60">{t("code")}</FormLabel>
 <FormControl>
 <Input 
 placeholder={tb('placeholders.code')} 
 {...field} 
 />
 </FormControl>
 <FormMessage className="text-label-xs font-medium" />
 </FormItem>
 )}
 />
 
 <FormField
 control={form.control}
 name="status"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-label-xs font-bold uppercase text-muted-foreground/60">{t("status_label")}</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder={tb('placeholders.status')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none backdrop-blur-md">
 <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
 <SelectItem value="INACTIVE">{t('status.inactive')}</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xs font-medium" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="nameEn"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-label-xs font-bold uppercase text-muted-foreground/60">{t('name_en')}</FormLabel>
 <FormControl>
 <Input 
 placeholder={tb('placeholders.main_riyadh_en')} 
 {...field} 
 />
 </FormControl>
 <FormMessage className="text-label-xs font-medium" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="nameAr"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-label-xs font-bold uppercase text-muted-foreground/60">{t('name_ar')}</FormLabel>
 <FormControl>
 <Input 
 placeholder={tb('placeholders.main_riyadh_ar')} 
 className="text-end" 
 dir="rtl" 
 {...field} 
 />
 </FormControl>
 <FormMessage className="text-label-xs font-medium" />
 </FormItem>
 )}
 />
 </div>

 <div className="flex items-center justify-end gap-3 pt-8 mt-4">
 <Button 
 variant="outline" 
 type="button" 
 onClick={() => router.back()}
 disabled={isSubmitting}
 className="h-11 px-8 text-label-xs font-bold uppercase bg-transparent border-none hover:bg-surface-container-high hover:text-foreground transition-all rounded-xl"
 >
 {t("cancel")}
 </Button>
 <Button 
 type="submit" 
 disabled={isSubmitting}
 className="h-11 px-10 text-label-xs font-bold uppercase bg-gradient-to-br from-primary to-primary-container text-black hover:opacity-90 transition-all active:scale-[0.98] rounded-xl"
 >
 {isSubmitting ? t('saving') : t('create_branch')}
 </Button>
 </div>
 </form>
 </Form>
 )
}
