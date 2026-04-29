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
  const t = useTranslations("masterData.suppliers")
  const tc = useTranslations("masterData.common")
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full max-w-4xl bg-surface-container-low border border-border-surface p-8 rounded-xl shadow-lg relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('code')}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. V-001" className="bg-surface-container-medium font-mono uppercase" {...field} />
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
                <FormLabel className="text-muted-foreground">{t('status')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-surface-container-medium">
                      <SelectValue placeholder={t('status')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface-container-medium border-border-surface">
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
                <FormLabel className="text-muted-foreground">{t('name_en')}</FormLabel>
                <FormControl>
                  <Input placeholder="Global Distributors" className="bg-surface-container-medium" {...field} />
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
                <FormLabel className="text-muted-foreground">{t('name_ar')}</FormLabel>
                <FormControl>
                  <Input placeholder="الموزعون العالميون" className="bg-surface-container-medium text-end" dir="rtl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <h3 className="col-span-1 md:col-span-2 text-lg font-semibold border-b border-border-surface pb-2 mt-4">{t('contact_info')}</h3>

          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-muted-foreground">{t('contact_person')}</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" className="bg-surface-container-medium" {...field} />
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
                <FormLabel className="text-muted-foreground">{t('phone')}</FormLabel>
                <FormControl>
                  <Input placeholder="+966 50 000 0000" className="bg-surface-container-medium" dir="ltr" {...field} />
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
                <FormLabel className="text-muted-foreground">{t('email')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="vendor@example.com" className="bg-surface-container-medium" dir="ltr" {...field} />
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
                <FormLabel className="text-muted-foreground">{t('tax_number')}</FormLabel>
                <FormControl>
                  <Input placeholder={tc('not_set')} className="bg-surface-container-medium font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-border-surface">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="bg-surface-container-low text-foreground border-border-surface hover:bg-surface-container-medium"
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
