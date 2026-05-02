'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
 Form, 
 FormControl, 
 FormField, 
 FormItem, 
 FormLabel, 
 FormMessage 
} from '@/components/ui/form';
import { apiClient } from '@/lib/api/client';
import { ResetPasswordSchema, ResetPasswordInput, AuthSuccessResponseSchema } from '@/types/auth';

export default function ResetPasswordPage() {
 const t = useTranslations('auth');
 const params = useParams();
 const router = useRouter();
 const searchParams = useSearchParams();
 const locale = params.locale as string;
 const token = searchParams.get('token');
 
 const [showPassword, setShowPassword] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const form = useForm<ResetPasswordInput>({
 resolver: zodResolver(ResetPasswordSchema),
 defaultValues: {
 token: token || '',
 password: '',
 confirmPassword: '',
 },
 });

 const { isSubmitting } = form.formState;

 // Sync token if it comes late or changes
 useEffect(() => {
 if (token) {
 form.setValue('token', token);
 }
 }, [token, form]);

 const onSubmit = async (data: ResetPasswordInput) => {
 try {
 setError(null);
 await apiClient.post('/auth/reset-password', AuthSuccessResponseSchema, data);
 setIsSuccess(true);
 
 // Auto redirect after 3 seconds
 setTimeout(() => {
 router.push(`/ ${locale}/login`);
 }, 3000);
 } catch (err) {
 setError(t('invalid_credentials')); // Fallback error
 }
 };

 if (!token && !isSuccess) {
 return (
 <div className="w-full max-w-md p-8 bg-surface-container-low rounded-2xl border border-border-muted/50 text-center">
 <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-status-error/20">
 <AlertCircle className="w-8 h-8 text-status-error" />
 </div>
 <h2 className="text-headline-lg font-bold text-foreground mb-2">{t('invalid_reset_link')}</h2>
 <p className="text-muted-foreground/60 mb-8 text-body-md">
 {t('invalid_reset_link_desc')}
 </p>
 <Link 
 href={`/ ${locale}/forgot-password`} 
 className="inline-flex items-center gap-2 text-operational-cyan hover:text-operational-cyan/80 font-medium"
 >
 {t('forgot_password')}
 </Link>
 </div>
 );
 }

 if (isSuccess) {
 return (
 <div className="w-full max-w-md p-8 bg-surface-container-low rounded-2xl border border-border-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center relative overflow-hidden">
 {/* Glow effect */}
 <div className="absolute -top-24 -start-24 w-48 h-48 bg-operational-cyan/10 blur-3xl rounded-full" />
 
 <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-status-success/20">
 <CheckCircle2 className="w-8 h-8 text-status-success" />
 </div>
 <h2 className="text-headline-lg font-bold text-foreground mb-2">{t('password_reset_success')}</h2>
 <p className="text-muted-foreground/60 mb-8 text-body-md leading-relaxed">
 {t('password_reset_redirect')}
 </p>
 <Link 
 href={`/ ${locale}/login`} 
 className="inline-flex items-center gap-2 text-operational-cyan hover:text-operational-cyan/80 font-medium transition-colors"
 >
 {t('back_to_login')}
 </Link>
 </div>
 );
 }

 return (
 <div className="w-full max-w-md p-8 bg-surface-container-low rounded-2xl border border-border-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
 {/* Glow effect */}
 <div className="absolute -top-24 -end-24 w-48 h-48 bg-operational-cyan/10 blur-3xl rounded-full" />

 <div className="mb-8 text-center relative">
 <div className="w-12 h-12 bg-operational-cyan/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-operational-cyan/20">
 <Lock className="w-6 h-6 text-operational-cyan" />
 </div>
 <h1 className="text-headline-lg font-bold text-foreground">{t('reset_password')}</h1>
 <p className="text-muted-foreground/60 mt-2 text-body-md">
 {t('reset_password_desc')}
 </p>
 </div>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative">
 <FormField
 control={form.control}
 name="password"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-body-md font-medium text-foreground ms-1">{t('new_password')}</FormLabel>
 <FormControl>
 <div className="relative">
 <Input
 {...field}
 type={showPassword ? 'text' : 'password'} className="bg-surface-container-lowest border-border-muted/50 focus:border-operational-cyan/50 focus:ring-1 focus:ring-operational-cyan/30 transition-all py-6 h-12 pe-10"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
 >
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </FormControl>
 <FormMessage className="text-label-sm text-status-error" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="confirmPassword"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-body-md font-medium text-foreground ms-1">{t('confirm_new_password')}</FormLabel>
 <FormControl>
 <Input
 {...field}
 type="password"
 className="bg-surface-container-lowest border-border-muted/50 focus:border-operational-cyan/50 focus:ring-1 focus:ring-operational-cyan/30 transition-all py-6 h-12"
 />
 </FormControl>
 <FormMessage className="text-label-sm text-status-error" />
 </FormItem>
 )}
 />

 {error && (
 <div className="p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-label-sm animate-in fade-in duration-300">
 {error}
 </div>
 )}

 <Button 
 type="submit" 
 disabled={isSubmitting}
 className="w-full h-12 mt-2 text-title-sm font-bold bg-primary hover:brightness-110 text-primary-foreground transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-70 rounded-xl"
 >
 {isSubmitting ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 t('reset_password')
 )}
 </Button>
 </form>
 </Form>
 </div>
 );
}
