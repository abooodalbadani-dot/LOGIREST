'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, ShieldCheck, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const passwordSchema = z.object({
 current_password: z.string().min(1, 'Current password is required'),
 new_password: z.string().min(8, 'Password must be at least 8 characters'),
 confirm_password: z.string().min(1, 'Confirmation is required'),
}).refine((data) => data.new_password === data.confirm_password, {
 message: "Passwords don't match",
 path: ["confirm_password"],
});

type PasswordValues = z.infer<typeof passwordSchema>;

export default function ChangePasswordClient() {
 const t = useTranslations('profile');
 const tc = useTranslations('common');
 
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);

 const { register, handleSubmit, formState: { errors }, reset } = useForm<PasswordValues>({
 resolver: zodResolver(passwordSchema),
 });

 const onSubmit = async (values: PasswordValues) => {
 setIsSubmitting(true);
 try {
 // Simulate API call
 await new Promise(resolve => setTimeout(resolve, 1500));
 
 setIsSuccess(true);
 toast.success(t('password_updated'));
 reset();
 setTimeout(() => setIsSuccess(false), 5000);
 } catch (error) {
 toast.error(t('errors.update_failed'));
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Card className="border-border-muted/20 bg-surface-container-low/50 backdrop-blur-md relative overflow-hidden group shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]">
 {/* Ghost Border - Top Glow */}
 <div className="absolute -top-[1px] start-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-operational-cyan/50 to-transparent shadow-[0_0_20px_rgba(var(--operational-cyan-rgb),0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
 
 <CardHeader className="pb-4">
 <div className="flex items-center gap-2 mb-1">
 <ShieldCheck className="w-4 h-4 text-operational-cyan animate-pulse" />
 <CardTitle className="text-title-sm uppercase">{t('security')}</CardTitle>
 </div>
 <CardDescription className="text-muted-foreground/60 font-medium">{t('change_password')}</CardDescription>
 </CardHeader>
 
 <CardContent className="relative z-10">
 {isSuccess ? (
 <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-in zoom-in-95 duration-500">
 <div className="p-6 bg-operational-cyan/10 rounded-full border border-operational-cyan/20 shadow-[0_0_40px_rgba(var(--operational-cyan-rgb),0.15)]">
 <CheckCircle2 className="w-12 h-12 text-operational-cyan" />
 </div>
 <div className="space-y-2">
 <p className="text-foreground font-semibold text-title-lg uppercase">{t('password_updated')}</p>
 <p className="text-body-md text-muted-foreground/60 font-medium">{t('security_hardened')}</p>
 </div>
 <Button variant="outline" onClick={() => setIsSuccess(false)} className="mt-2 border-border-muted/30 hover:bg-surface-container-high px-8 rounded-xl font-bold uppercase text-label-xs">
 {tc('actions.done')}
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="current_password" className="text-label-xs uppercase font-bold text-muted-foreground/40">
 {t('current_password')}
 </Label>
 <div className="relative group/input">
 <Input
 id="current_password"
 type="password"
 className="bg-surface-container-low border-border-muted/30 focus-visible:ring-operational-cyan/20 focus-visible:border-operational-cyan/50 h-11 transition-all ps-10"
 {...register('current_password')}
 />
 <KeyRound className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within/input:text-operational-cyan transition-colors" />
 </div>
 {errors.current_password && (
 <div className="flex items-center gap-1.5 text-status-error mt-1.5 animate-in slide-in-from-top-1">
 <AlertCircle className="w-3 h-3" />
 <p className="text-label-xs font-bold uppercase">{errors.current_password.message}</p>
 </div>
 )}
 </div>
 
 <div className="space-y-2">
 <Label htmlFor="new_password" className="text-label-xs uppercase font-bold text-muted-foreground/40">
 {t('new_password')}
 </Label>
 <Input
 id="new_password"
 type="password"
 className="bg-surface-container-low border-border-muted/30 focus-visible:ring-operational-cyan/20 focus-visible:border-operational-cyan/50 h-11 transition-all"
 {...register('new_password')}
 />
 {errors.new_password && (
 <div className="flex items-center gap-1.5 text-status-error mt-1.5 animate-in slide-in-from-top-1">
 <AlertCircle className="w-3 h-3" />
 <p className="text-label-xs font-bold uppercase">{errors.new_password.message}</p>
 </div>
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="confirm_password" className="text-label-xs uppercase font-bold text-muted-foreground/40">
 {t('confirm_password')}
 </Label>
 <Input
 id="confirm_password"
 type="password"
 className="bg-surface-container-low border-border-muted/30 focus-visible:ring-operational-cyan/20 focus-visible:border-operational-cyan/50 h-11 transition-all"
 {...register('confirm_password')}
 />
 {errors.confirm_password && (
 <div className="flex items-center gap-1.5 text-status-error mt-1.5 animate-in slide-in-from-top-1">
 <AlertCircle className="w-3 h-3" />
 <p className="text-label-xs font-bold uppercase">{errors.confirm_password.message}</p>
 </div>
 )}
 </div>

 <Button 
 type="submit" 
 className="w-full bg-operational-cyan text-white font-semibold uppercase transition-all h-12 rounded-xl shadow-[0_12px_24px_-8px_rgba(var(--operational-cyan-rgb),0.4)] hover:brightness-110 active:scale-[0.98] text-label-xs" 
 disabled={isSubmitting}
 >
 {isSubmitting ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <div className="flex items-center gap-2">
 <ShieldCheck className="w-4 h-4" />
 {t('change_password')}
 </div>
 )}
 </Button>
 </form>
 )}
 </CardContent>
 </Card>

 );
}
