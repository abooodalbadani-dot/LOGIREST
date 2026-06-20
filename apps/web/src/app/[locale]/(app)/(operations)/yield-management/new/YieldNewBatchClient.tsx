'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
 ArrowLeft,
 UtensilsCrossed
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { FormFooter } from '@/components/layouts/FormLayout';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
import { cn } from '@/lib/utils';

import { useCreateYieldBatch } from '@/features/operations/hooks/useCreateYieldBatch';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

export function YieldNewBatchClient() {
 const t = useTranslations('yield_management');
 const tc = useTranslations('common');
 const locale = useLocale();
 const router = useRouter();
 
 const [recipeSearch, setRecipeSearch] = useState('');
 const [inputQty, setInputQty] = useState('');

 const { mutate: createBatch, isPending } = useCreateYieldBatch();
 const { playSound } = useAudioFeedback();

 // Unsaved Changes Guard
 const isDirty = useMemo(() => {
  return !!recipeSearch || !!inputQty;
 }, [recipeSearch, inputQty]);

 const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

 const handleSubmit = (e?: React.FormEvent) => {
  e?.preventDefault();
  if (!recipeSearch || !inputQty) return;
  
  createBatch({
   recipeName: recipeSearch,
   category: 'GENERAL',
   inputQty: parseFloat(inputQty),
   outputQty: parseFloat(inputQty), // Will be refined once recipe lookup is implemented
  }, {
   onSuccess: () => {
    playSound('success');
    guardedRouter.push('/yield-management', { skipGuard: true });
   },
   onError: () => {
    playSound('error');
   }
  });
 };

 return (
  <div className="min-w-0 bg-card flex-1 fade-in gap-6 border shadow-sm duration-200 animate-in flex-col flex min-h-screen pb-32 border-border w-full dark:bg-card-dark">
   <div className="glass-header sticky top-0 z-50 h-16 px-6 lg:px-10 flex items-center justify-between gap-6">
    <div className="flex items-center gap-6">
     <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => guardedRouter.push('/yield-management', { skipGuard: true })}
      className="rounded-xl shrink-0 hover:bg-primary/5 transition-colors"
     >
      <ArrowLeft className={cn("w-5 h-5 text-primary", locale === 'ar' && "rotate-180")} />
     </Button>
     <h1 className="text-title-lg font-semibold uppercase italic text-foreground leading-none">
      {t('new_batch')}
     </h1>
    </div>
   </div>

   <div className="flex-1 p-8 max-w-[1200px] mx-auto w-full space-y-10">
    <div className="space-y-4">
     <Breadcrumb 
      items={[
       { label: t('title'), href: '/yield-management' },
       { label: t('new_batch') }
      ]} 
     />
    </div>

    <form onSubmit={handleSubmit} className="space-y-8">
     <Card className="p-8 bg-card border border-border shadow-sm border-none shadow-sm space-y-8">
      <div className="flex items-center gap-4 text-primary">
       <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <UtensilsCrossed className="w-6 h-6 text-primary" />
       </div>
       <div>
        <h3 className="text-label-xs font-semibold uppercase text-primary/30">{t('batch_details')}</h3>
        <p className="text-label-xs text-primary/20 font-bold">{t('batch_details_desc')}</p>
       </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="space-y-3">
        <Label className="text-label-xs font-semibold uppercase text-muted-foreground/60">
         {tc('recipe')}
        </Label>
        <Input 
         value={recipeSearch}
         onChange={(e) => setRecipeSearch(e.target.value)}
         placeholder={tc('search_placeholder')} 
         className="w-full h-12 bg-surface-container-highest border-none rounded-xl px-4 font-bold text-label-sm transition-all placeholder:text-muted-foreground/20 shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10"
        />
       </div>

       <div className="space-y-3">
        <Label className="text-label-xs font-semibold uppercase text-muted-foreground/60">
         {t('input_qty')} (kg)
        </Label>
        <Input 
         type="number"
         value={inputQty}
         onChange={(e) => setInputQty(e.target.value)}
         placeholder="0.00" 
         className="w-full h-12 bg-surface-container-highest border-none rounded-xl px-4 font-bold text-label-sm transition-all placeholder:text-muted-foreground/20 shadow-none focus-visible:ring-1 focus-visible:ring-primary-fixed-dim/10"
        />
       </div>
      </div>
     </Card>
     
     <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
      <p className="text-label-xs font-bold uppercase tracking-widest text-primary/40">Additional batch parameters will be added here</p>
     </div>
    </form>
   </div>

   <FormFooter 
    onCancel={() => guardedRouter.push('/yield-management', { skipGuard: true })}
    onSubmit={handleSubmit}
    isPending={isPending}
    submitLabel={tc('actions.save')}
    canSubmit={!!recipeSearch && !!inputQty}
    isDirty={isDirty}
   />
  </div>
 );
}


