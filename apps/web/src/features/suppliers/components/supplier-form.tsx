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

const formSchema = z.object({
 code: z.string().min(1).max(50),
 nameEn: z.string().min(1),
 nameAr: z.string().min(1),
 contactPerson: z.string().min(1),
 email: z.string().email(),
 phone: z.string().min(1),
 taxNumber: z.string().optional(),
 status: z.enum(["ACTIVE", "INACTIVE"]),
})

export function SupplierForm() {
 const router = useRouter()
 const t = useTranslations("master_data.suppliers")
 const tc = useTranslations("master_data.common")
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
 <Input placeholder={t('code_placeholder')} className="font-mono uppercase" {...field} />
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('status')}</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder={t('status')} />
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

 <FormField
 control={form.control}
 name="nameEn"
 render={({ field }) => (
 <FormItem className="text-start">
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
 <FormItem className="text-end" dir="rtl">
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('name_ar')}</FormLabel>
 <FormControl>
 <Input placeholder={t('name_ar_placeholder')} className="text-end" dir="rtl" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <h3 className="col-span-1 md:col-span-2 text-title-lg font-semibold uppercase flex items-center gap-2 mt-4">
 <span className="w-1.5 h-1.5 bg-operational-cyan rounded-full animate-pulse" />
 {t('contact_info')}
 </h3>

 <FormField
 control={form.control}
 name="contactPerson"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('contact_person')}</FormLabel>
 <FormControl>
 <Input placeholder={t('contact_person_placeholder')} {...field} />
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('phone')}</FormLabel>
 <FormControl>
 <Input placeholder={t('phone_placeholder')} dir="ltr" {...field} />
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('email')}</FormLabel>
 <FormControl>
 <Input type="email" placeholder={t('email_placeholder')} dir="ltr" {...field} />
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
 <FormLabel className="text-muted-foreground/60 text-label-xs uppercase font-bold">{t('tax_number')}</FormLabel>
 <FormControl>
 <Input placeholder={tc('not_set')} className="font-mono" {...field} />
 </FormControl>
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
