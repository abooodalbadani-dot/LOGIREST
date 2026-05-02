'use client';

import { useRestaurantProfile } from '@/features/admin/hooks/useRestaurantProfile';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * ReportHeader component for PDF/Print branding.
 * It remains hidden in the browser UI but appears automatically during printing.
 */
export function ReportHeader() {
 const { data: profile } = useRestaurantProfile();
 const locale = useLocale();
 const isRtl = locale === 'ar';

 if (!profile) return null;

 return (
 <div className="hidden print:flex flex-col gap-6 mb-10 border-b border-surface-variant/20 pb-8 animate-in fade-in duration-500">
 <div className="flex items-start justify-between">
 <div className="flex flex-col gap-2">
 <h1 className="text-headline-lg font-semibold text-foreground">
 {profile.name}
 </h1>
 <p className="text-label-sm text-muted-foreground whitespace-pre-wrap max-w-lg leading-relaxed">
 {profile.address}
 </p>
 </div>
 
 {profile.logo && (
 <div className="w-24 h-24 relative flex items-center justify-center bg-white p-2 rounded-xl shadow-sm border border-surface-variant/10">
 {/* Using standard img for reliable print rendering of base64 */}
 <img 
 src={profile.logo} 
 alt="Restaurant Logo" 
 className="max-w-full max-h-full object-contain"
 />
 </div>
 )}
 </div>

 <div className={cn(
 "grid grid-cols-2 md:grid-cols-4 gap-4 text-label-xs font-semibold uppercase text-muted-foreground/60",
 
 )}>
 <div className="flex flex-col gap-1">
 <span className="opacity-40">{isRtl ? 'الهاتف' : 'Phone'}</span>
 <span dir="ltr" className="text-foreground">{profile.phone}</span>
 </div>
 <div className="flex flex-col gap-1">
 <span className="opacity-40">{isRtl ? 'البريد الإلكتروني' : 'Email'}</span>
 <span className="text-foreground lowercase">{profile.email}</span>
 </div>
 {profile.tax_number && (
 <div className="flex flex-col gap-1">
 <span className="opacity-40">{isRtl ? 'الرقم الضريبي' : 'Tax Number'}</span>
 <span dir="ltr" className="text-foreground">{profile.tax_number}</span>
 </div>
 )}
 {profile.commercial_registration && (
 <div className="flex flex-col gap-1">
 <span className="opacity-40">{isRtl ? 'السجل التجاري' : 'CR Number'}</span>
 <span dir="ltr" className="text-foreground">{profile.commercial_registration}</span>
 </div>
 )}
 </div>
 </div>
 );
}
