'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import Image from 'next/image';
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
 Plus, 
 ChevronRight, 
 ChevronLeft, 
 Camera, 
 Settings2, 
 Box, 
 Bell, 
 Info,
 CheckCircle2,
 Trash2,
 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';



export function ItemForm() {
 const locale = useLocale() as 'ar' | 'en';
 const isRtl = locale === 'ar';
 const t = useTranslations('operational.item_form');
 const tc = useTranslations('common');
 const tValidation = useTranslations('operational.item_form.validation');
 const router = useRouter();
 
 const formSchema = React.useMemo(() => z.object({
 sku: z.string().min(2, tValidation('sku_min')).max(50),
 nameEn: z.string().min(2, tValidation('name_en_required')),
 nameAr: z.string().min(2, tValidation('name_ar_required')),
 category: z.enum(['FOOD', 'EQUIPMENT', 'PACKAGING', 'SUPPLIES']),
 baseUom: z.enum(['EA', 'KG', 'L', 'BOX', 'PACK']),
 conversions: z.array(z.object({
 toUom: z.string(),
 factor: z.number().min(0),
 })).optional(),
 minStockLevel: z.number().min(0, tValidation('min_stock_negative')),
 alertThreshold: z.number().min(0),
 status: z.enum(["ACTIVE", "INACTIVE"]),
 }), [tValidation]);

 type ItemFormValues = z.infer<typeof formSchema>;

 const [step, setStep] = React.useState(1);
 const [isSubmitting, setIsSubmitting] = React.useState(false);
 const [uploadedImage, setUploadedImage] = React.useState<string | null>(null);

 const form = useForm<ItemFormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 sku: "",
 nameEn: "",
 nameAr: "",
 category: "FOOD",
 baseUom: "EA",
 conversions: [],
 minStockLevel: 0,
 alertThreshold: 0,
 },
 });

 const watchedSku = useWatch({ control: form.control, name: 'sku' });
 const watchedCategory = useWatch({ control: form.control, name: 'category' });

 async function onSubmit(values: ItemFormValues) {
 if (step < 3) {
 setStep(step + 1);
 return;
 }
 setIsSubmitting(true);
 try {
 console.log(values);
 await new Promise(r => setTimeout(r, 1500));
 router.push('/master-data/items');
 } catch (error) {
 console.error(error);
 } finally {
 setIsSubmitting(false);
 }
 }

 const steps = [
 { id: 1, title: t('steps.basic'), icon: Info },
 { id: 2, title: t('steps.uom'), icon: Box },
 { id: 3, title: t('steps.alerts'), icon: Bell },
 ];

 return (
 <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto p-4 lg:p-8 min-h-[800px] animate-in fade-in slide-in-from-bottom-8 duration-200">
 
 {/* Left Sidebar: Image & Stats */}
 <div className="w-full lg:w-[380px] space-y-8">
 <div className="p-8 rounded-2xl bg-surface-container-low overflow-hidden relative group transition-all duration-200">
 <div className="absolute inset-0 bg-gradient-to-br from-operational-cyan/5 to-transparent pointer-events-none" />
 <div className="flex flex-col items-center gap-6 text-center">
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">
 {t('image.label')}
 </span>
 <div className="relative group/img">
 <div className="w-56 h-56 rounded-2xl bg-surface-container-highest flex items-center justify-center border-2 border-dashed border-operational-cyan/20 group-hover:border-operational-cyan/40 transition-all overflow-hidden">
 {uploadedImage ? (
  <Image src={uploadedImage} alt={tc('item')} fill className="object-cover animate-in zoom-in-95 duration-200" />
 ) : (
 <div className="flex flex-col items-center gap-3">
 <Camera className="w-10 h-10 text-operational-cyan/40 group-hover/img:scale-110 transition-transform" />
 <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">
 {t('image.upload_hint')}
 </span>
 </div>
 )}
 </div>
 {uploadedImage && (
 <button 
 onClick={() => setUploadedImage(null)}
 className="absolute -top-2 -end-2 w-10 h-10 rounded-2xl bg-status-error text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 )}
 </div>
  <div className="space-y-2">
 <p className="text-label-xs font-semibold text-muted-foreground/60 uppercase">
 {t('image.resolution')}
 </p>
 <p className="text-label-xs font-semibold text-muted-foreground/20 uppercase">
 {t('image.upload_constraints')}
 </p>
 </div>
 </div>
 </div>
 
 <div className="p-8 rounded-2xl bg-surface-container-low transition-all duration-200">
 <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/40 mb-6 pb-4">
 {t('glance.title')}
 </h4>
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-label-xs font-semibold text-muted-foreground/60">{t('glance.sku')}</span>
 <span className="font-mono text-label-sm font-semibold text-foreground uppercase">{watchedSku || tc('null_select')}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-label-xs font-semibold text-muted-foreground/60">{t('glance.category')}</span>
 <Badge className="bg-operational-cyan/10 text-operational-cyan border-none text-label-xxs font-semibold uppercase px-4 py-1 rounded-full">
 {watchedCategory}
 </Badge>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content: Multi-step Form */}
 <div className="flex-1">
 <div className="mb-10 px-4">
 <div className="flex items-center justify-between mb-8">
 <div className="flex flex-col gap-1">
 <h2 className="text-headline-lg font-semibold text-foreground">
 {t('header.title')}
 </h2>
 <p className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
 {t('header.subtitle')}
 </p>
 </div>
 <div className="flex items-center gap-2">
 {steps.map((s) => (
 <div key={s.id} className="flex items-center">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${ step >= s.id ? 'bg-operational-cyan text-white' : 'bg-surface-container-high text-muted-foreground/40' }`}>
 {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
 </div>
 {s.id < 3 && (
 <div className={`w-8 h-0.5 mx-2 transition-all duration-200 ${ step > s.id ? 'bg-operational-cyan' : 'bg-surface-container-high' }`} />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
 <div className="p-10 rounded-2xl bg-surface-container-lowest relative overflow-hidden transition-all duration-200">
 <div className="absolute top-0 end-0 p-8">
 <span className="text-display-lg text-foreground/5 select-none leading-none">0{step}</span>
 </div>

 {step === 1 && (
 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <FormField
 control={form.control}
 name="sku"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.sku')}
 </FormLabel>
 <FormControl>
 <Input placeholder={t('placeholders.sku')} {...field} />
 </FormControl>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="category"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.category')}
 </FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="text-label-xs font-semibold uppercase">
 <SelectValue placeholder={t('placeholders.select_category')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-2xl">
 <SelectItem value="FOOD" className="text-label-xs font-semibold uppercase">{tc('categories.food')}</SelectItem>
 <SelectItem value="EQUIPMENT" className="text-label-xs font-semibold uppercase">{tc('categories.equipment')}</SelectItem>
 <SelectItem value="PACKAGING" className="text-label-xs font-semibold uppercase">{tc('categories.packaging')}</SelectItem>
 <SelectItem value="SUPPLIES" className="text-label-xs font-semibold uppercase">{tc('categories.supplies')}</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <FormField
 control={form.control}
 name="nameAr"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.name_ar')}
 </FormLabel>
 <FormControl>
 <Input placeholder={t('placeholders.name_ar')} className="text-end font-bold" dir="rtl" {...field} />
 </FormControl>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="nameEn"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.name_en')}
 </FormLabel>
 <FormControl>
 <Input placeholder={t('placeholders.name_en')} className="font-bold" {...field} />
 </FormControl>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <FormField
 control={form.control}
 name="baseUom"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.base_unit')}
 </FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="text-label-xs font-semibold uppercase">
 <SelectValue placeholder={t('placeholders.select_uom')} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="bg-surface-container-low border-none rounded-2xl">
 <SelectItem value="EA" className="text-label-xs font-semibold uppercase">{tc('uoms.ea')}</SelectItem>
 <SelectItem value="KG" className="text-label-xs font-semibold uppercase">{tc('uoms.kg')}</SelectItem>
 <SelectItem value="L" className="text-label-xs font-semibold uppercase">{tc('uoms.l')}</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />
 </div>

 <div className="bg-surface-container-low/40 rounded-2xl p-8 border-none space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Settings2 className="w-5 h-5 text-operational-cyan" />
 <h5 className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('fields.conversions')}</h5>
 </div>
 <Button type="button" variant="ghost" size="sm" className="h-9 px-4 bg-operational-cyan/10 text-operational-cyan rounded-xl text-label-xxs font-semibold uppercase">
 <Plus className="w-3 h-3 me-2" />
 {t('fields.add_conversion')}
 </Button>
 </div>
 <div className="text-label-xs font-semibold text-muted-foreground/30 uppercase text-center py-8 bg-surface-container-low/20 rounded-2xl border-2 border-dashed border-operational-cyan/10">
 {t('fields.no_conversions')}
 </div>
 </div>
 </div>
 )}

 {step === 3 && (
 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <FormField
 control={form.control}
 name="minStockLevel"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.min_stock')}
 </FormLabel>
 <FormControl>
 <Input 
 type="number" 
 className="font-mono font-bold" 
 {...field} 
 onChange={(e) => field.onChange(e.target.valueAsNumber)}
 />
 </FormControl>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="alertThreshold"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-label-xs font-semibold text-muted-foreground/60 uppercase ps-1">
 {t('fields.alert_threshold')}
 </FormLabel>
 <FormControl>
 <Input 
 type="number" 
 className="font-mono font-bold" 
 {...field} 
 onChange={(e) => field.onChange(e.target.valueAsNumber)}
 />
 </FormControl>
 <FormMessage className="text-label-xs font-bold" />
 </FormItem>
 )}
 />
 </div>

 <div className="p-6 bg-status-warning/5 rounded-2xl border-none flex items-start gap-4">
 <div className="w-10 h-10 rounded-2xl bg-status-warning/10 flex items-center justify-center shrink-0">
 <Bell className="w-5 h-5 text-status-warning" />
 </div>
 <div className="space-y-1 pt-1">
 <h6 className="text-label-sm font-semibold uppercase text-status-warning">{t('fields.notifications')}</h6>
 <p className="text-label-xs font-semibold text-muted-foreground/60 leading-relaxed uppercase">
 {t('fields.notifications_desc')}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Wizard Footer Actions */}
 <div className="mt-16 flex items-center justify-between pt-10">
 <Button 
 type="button" 
 variant="ghost" 
 disabled={step === 1 || isSubmitting}
 onClick={() => setStep(step - 1)}
 className="h-14 px-8 rounded-2xl text-label-xs font-semibold uppercase text-muted-foreground gap-3 hover:bg-surface-container-low"
 >
 <ChevronLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
 {t('actions.previous')}
 </Button>

 <Button 
 type="submit" 
 disabled={isSubmitting}
 className={`h-14 px-12 rounded-2xl text-label-xs font-semibold uppercase gap-3 transition-all hover:scale-[0.98] hover:brightness-110 active:scale-95 ${ step === 3 ? 'bg-status-success hover:bg-status-success/90 text-white' : 'primary-gradient text-white hover:opacity-90' }`}
 >
 {isSubmitting ? (
 t('actions.saving')
 ) : (
 <>
 {step === 3 ? t('actions.save') : t('actions.next')}
 {step < 3 && <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />}
 {step === 3 && <CheckCircle2 className="w-4 h-4" />}
 </>
 )}
 </Button>
 </div>
 </div>
 </form>
 </Form>
 </div>
 </div>
 );
}
