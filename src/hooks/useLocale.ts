import { useLocale as useNextIntlLocale, useTranslations } from 'next-intl';

export function useLocale() {
  const locale = useNextIntlLocale();
  const t = useTranslations('Common');
  
  return {
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    isRtl: locale === 'ar',
    t
  };
}
