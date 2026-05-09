'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ArrowLeft, Mail, CheckCircle2, Loader2, Lock } from 'lucide-react';
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
import { ForgotPasswordSchema, ForgotPasswordInput, AuthSuccessResponseSchema } from '@/types/auth';

export default function ForgotPasswordPage() {
 const t = useTranslations('auth');
 const params = useParams();
 const locale = params.locale as string;

 const [isSubmitted, setIsSubmitted] = useState(false);
 const [error, setError] = useState<string | null>(null);

 const form = useForm<ForgotPasswordInput>({
 resolver: zodResolver(ForgotPasswordSchema),
 defaultValues: {
 email: '',
 },
 });

 const { isSubmitting } = form.formState;

 const onSubmit = async (data: ForgotPasswordInput) => {
 try {
 setError(null);
 await apiClient.post('/auth/forgot-password', AuthSuccessResponseSchema, data);
 setIsSubmitted(true);
 } catch (err) {
 setError(t('invalid_credentials')); // Fallback error
 }
 };

 if (isSubmitted) {
 return (
 <div className="w-full max-w-md p-8 bg-surface-container-low rounded-2xl border border-border-muted/50 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center relative overflow-hidden">
 {/* Glow effect */}
 <div className="absolute -top-24 -start-24 w-48 h-48 bg-operational-cyan/10 blur-3xl rounded-full" />

 <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-status-success/20">
 <CheckCircle2 className="w-8 h-8 text-status-success" />
 </div>
 <h2 className="text-headline-lg font-bold text-foreground mb-2">{t('email_sent')}</h2>
 <p className="text-muted-foreground/60 mb-8 text-body-md leading-relaxed">
 {t('email_sent_desc', { email: form.getValues('email') })}
 </p>
 <Link
        href="/login"
 className="inline-flex items-center gap-2 text-operational-cyan hover:text-operational-cyan/80 font-medium transition-colors group"
 >
 <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
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
 <h1 className="text-headline-lg font-bold text-foreground">{t('forgot_password')}</h1>
 <p className="text-muted-foreground/60 mt-2 text-body-md">
 {t('forgot_password_desc')}
 </p>
 </div>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative">
 <FormField
 control={form.control}
 name="email"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-body-md font-medium text-foreground ms-1 flex items-center gap-2">
 <Mail className="w-4 h-4 text-muted-foreground/60" />
 {t('email')}
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 type="email"
 placeholder="name@example.com"
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
 className="w-full h-12 text-title-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-70 rounded-xl"
 >
 {isSubmitting ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 t('send_reset_link')
 )}
 </Button>

 <div className="text-center mt-6">
 <Link
        href="/login"
 className="text-body-md text-muted-foreground/60 hover:text-operational-cyan transition-colors inline-flex items-center gap-2 group"
 >
 <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
 {t('back_to_login')}
 </Link>
 </div>
 </form>
 </Form>
 </div>
 );
}
