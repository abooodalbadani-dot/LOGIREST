'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useUnsavedChanges } from '@/lib/unsaved-changes/UnsavedChangesProvider';

export default function LocaleSwitcher() {
 const t = useTranslations('common');
 const params = useParams();
 const pathname = usePathname();
 const router = useRouter();
 const { isDirty, openDialog } = useUnsavedChanges();
 
 // Safe hydration handling for locale
 const currentLocale = params?.locale as string || 'ar';
 const otherLocale = currentLocale === 'ar' ? 'en' : 'ar';
 const label = t(`locales.${otherLocale}`);

 const toggleLocale = () => {
  if (isDirty) {
   openDialog(pathname, { locale: otherLocale });
  } else {
   document.cookie = `NEXT_LOCALE=${otherLocale}; path=/`;
   router.replace(pathname, { locale: otherLocale });
  }
 };

 const [isMounted, setIsMounted] = useState(false);
 useEffect(() => {
  setTimeout(() => {
   setIsMounted(true);
  }, 0);
 }, []);

 if (!isMounted) return null;

 return (
  <button 
   onClick={toggleLocale}
   className="px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest border rounded-xl text-body-md font-medium transition-colors text-foreground"
  >
   {label}
  </button>
 );
}
