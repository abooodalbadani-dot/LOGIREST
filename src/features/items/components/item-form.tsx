'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
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
  Image as ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';



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
      status: "ACTIVE",
    },
  });

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
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto p-4 lg:p-8 min-h-[800px] animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Left Sidebar: Image & Stats */}
      <div className="w-full lg:w-[380px] space-y-6">
         <Card className="p-8 rounded-[2.5rem] border-white/5 bg-surface-container-low/40 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-operational-cyan/5 to-transparent pointer-events-none" />
            <div className="flex flex-col items-center gap-6 text-center">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                  {t('image.label')}
               </span>
               <div className="relative group/img">
                  <div className="w-56 h-56 rounded-[2.5rem] bg-surface-container-highest flex items-center justify-center border-2 border-dashed border-operational-cyan/20 group-hover:border-operational-cyan/40 transition-all overflow-hidden shadow-inner">
                     {uploadedImage ? (
                        <img src={uploadedImage} alt="Item" className="w-full h-full object-cover animate-in zoom-in-95 duration-500" />
                     ) : (
                        <div className="flex flex-col items-center gap-3">
                           <Camera className="w-10 h-10 text-operational-cyan/40 group-hover/img:scale-110 transition-transform" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                              {t('image.upload_hint')}
                           </span>
                        </div>
                     )}
                  </div>
                  {uploadedImage && (
                    <button 
                      onClick={() => setUploadedImage(null)}
                      className="absolute -top-2 -end-2 w-10 h-10 rounded-2xl bg-status-error text-white flex items-center justify-center shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
               </div>
               <div className="space-y-2">
                  <p className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-tight">
                     {t('image.resolution')}
                  </p>
                  <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-[0.2em]">
                     PNG, JPG or WEBP max 2MB
                  </p>
               </div>
            </div>
         </Card>

         <Card className="p-8 rounded-[2.5rem] border-white/5 bg-surface-container-low/40">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mb-6 border-b border-white/5 pb-4">
               {t('glance.title')}
            </h4>
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-muted-foreground/60">{t('glance.sku')}</span>
                  <span className="font-mono text-xs font-black text-foreground uppercase">{form.watch('sku') || '—'}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-muted-foreground/60">{t('glance.category')}</span>
                  <Badge className="bg-operational-cyan/10 text-operational-cyan border-none text-[9px] font-black uppercase tracking-widest px-3">
                     {form.watch('category')}
                  </Badge>
               </div>
            </div>
         </Card>
      </div>

      {/* Main Content: Multi-step Form */}
      <div className="flex-1">
         <div className="mb-10 px-4">
            <div className="flex items-center justify-between mb-8">
               <div className="flex flex-col gap-1">
                  <h2 className="text-3xl font-black tracking-tight text-foreground">
                     {t('header.title')}
                  </h2>
                  <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">
                     {t('header.subtitle')}
                  </p>
               </div>
               <div className="flex items-center gap-2">
                  {steps.map((s) => (
                    <div key={s.id} className="flex items-center">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                          step >= s.id ? 'bg-operational-cyan text-white shadow-lg shadow-operational-cyan/20' : 'bg-surface-container-high text-muted-foreground/40'
                       }`}>
                          {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                       </div>
                       {s.id < 3 && (
                         <div className={`w-8 h-0.5 mx-2 transition-all duration-500 ${
                            step > s.id ? 'bg-operational-cyan' : 'bg-surface-container-high'
                         }`} />
                       )}
                    </div>
                  ))}
               </div>
            </div>
         </div>

         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
               <Card className="p-10 rounded-[3rem] border-white/5 bg-surface-container-low/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
                  <div className="absolute top-0 end-0 p-8">
                     <span className="text-[64px] font-black text-foreground/5 select-none leading-none">0{step}</span>
                  </div>

                  {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="sku"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.sku')}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="E.G. ITEM-9902" className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 font-mono font-black text-sm uppercase focus-visible:ring-operational-cyan/30" {...field} />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.category')}
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-tight focus:ring-operational-cyan/30">
                                      <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-surface-container-low border-white/10 rounded-2xl">
                                    <SelectItem value="FOOD" className="text-[10px] font-black uppercase">{tc('categories.food')}</SelectItem>
                                    <SelectItem value="EQUIPMENT" className="text-[10px] font-black uppercase">{tc('categories.equipment')}</SelectItem>
                                    <SelectItem value="PACKAGING" className="text-[10px] font-black uppercase">{tc('categories.packaging')}</SelectItem>
                                    <SelectItem value="SUPPLIES" className="text-[10px] font-black uppercase">{tc('categories.supplies')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px] font-bold" />
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
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.name_ar')}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="أرز بسمتي 5 كجم" className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 font-black text-sm text-end focus-visible:ring-operational-cyan/30" dir="rtl" {...field} />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="nameEn"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.name_en')}
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Basmati Rice 5kg" className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 font-black text-sm focus-visible:ring-operational-cyan/30" {...field} />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                              </FormItem>
                            )}
                          />
                       </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="baseUom"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.base_unit')}
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-tight focus:ring-operational-cyan/30">
                                      <SelectValue placeholder="Select UoM" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-surface-container-low border-white/10 rounded-2xl">
                                    <SelectItem value="EA" className="text-[10px] font-black uppercase">{tc('uoms.ea')}</SelectItem>
                                    <SelectItem value="KG" className="text-[10px] font-black uppercase">{tc('uoms.kg')}</SelectItem>
                                    <SelectItem value="L" className="text-[10px] font-black uppercase">{tc('uoms.l')}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px] font-bold" />
                              </FormItem>
                            )}
                          />
                       </div>

                       <div className="bg-surface-container-low/40 rounded-[2rem] p-8 border border-white/5 space-y-6">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <Settings2 className="w-5 h-5 text-operational-cyan" />
                                <h5 className="text-[11px] font-black uppercase tracking-[0.2em]">{t('fields.conversions')}</h5>
                             </div>
                             <Button type="button" variant="ghost" size="sm" className="h-9 px-4 bg-operational-cyan/10 text-operational-cyan rounded-xl text-[9px] font-black uppercase tracking-widest">
                                <Plus className="w-3 h-3 me-2" />
                                {t('fields.add_conversion')}
                             </Button>
                          </div>
                          <div className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] text-center py-8 bg-surface-container-low/20 rounded-2xl border border-dashed border-white/5">
                             {t('fields.no_conversions')}
                          </div>
                       </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="minStockLevel"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.min_stock')}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 font-mono font-black text-sm focus-visible:ring-operational-cyan/30" 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                  />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="alertThreshold"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-[11px] font-black text-muted-foreground/60 uppercase tracking-widest ps-1">
                                   {t('fields.alert_threshold')}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    className="h-14 bg-surface-container-low border-white/5 rounded-2xl px-6 font-mono font-black text-sm focus-visible:ring-operational-cyan/30" 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                  />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                              </FormItem>
                            )}
                          />
                       </div>

                       <div className="p-6 bg-status-warning/5 rounded-3xl border border-status-warning/10 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-status-warning/10 flex items-center justify-center shrink-0">
                             <Bell className="w-5 h-5 text-status-warning" />
                          </div>
                          <div className="space-y-1 pt-1">
                             <h6 className="text-xs font-black uppercase text-status-warning tracking-tight">{t('fields.notifications')}</h6>
                             <p className="text-[10px] font-black text-muted-foreground/60 leading-relaxed uppercase tracking-tight">
                                {t('fields.notifications_desc')}
                             </p>
                          </div>
                       </div>
                    </div>
                  )}

                  {/* Wizard Footer Actions */}
                  <div className="mt-16 flex items-center justify-between pt-10 border-t border-white/5">
                     <Button 
                        type="button" 
                        variant="ghost" 
                        disabled={step === 1 || isSubmitting}
                        onClick={() => setStep(step - 1)}
                        className="h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground gap-3 hover:bg-surface-container-low"
                     >
                        <ChevronLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        {t('actions.previous')}
                     </Button>

                     <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`h-14 px-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] gap-3 transition-all active:scale-95 shadow-xl ${
                           step === 3 
                           ? 'bg-status-success hover:bg-status-success/90 text-white shadow-[0_15px_35px_rgba(var(--status-success-rgb),0.2)]' 
                           : 'bg-surface-ledger hover:bg-surface-ledger/90 text-white shadow-[0_15px_35px_rgba(0,0,0,0.3)]'
                        }`}
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
               </Card>
            </form>
         </Form>
      </div>
    </div>
  );
}
