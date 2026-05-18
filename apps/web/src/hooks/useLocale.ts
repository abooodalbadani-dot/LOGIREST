import { useLocale as useNextIntlLocale, useTranslations } from 'next-intl';

export function useLocale() {
 const locale = useNextIntlLocale();
 const t = useTranslations('common');
 const isRtl = locale === 'ar';
 
 return {
 locale,
 dir: isRtl ? 'rtl' : 'ltr',
 isRtl,
 t,
 gradientClass: isRtl ? 'bg-gradient-to-l' : 'bg-gradient-to-r'
 };
}
