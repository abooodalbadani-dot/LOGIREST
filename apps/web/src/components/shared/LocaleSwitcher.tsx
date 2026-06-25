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
   className="flex items-center justify-center h-9 sm:px-3 sm:py-1 w-9 sm:w-auto bg-surface-container-high hover:bg-surface-container-highest border rounded-xl text-body-md font-medium transition-colors text-foreground"
   title={label}
  >
   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:hidden"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
   <span className="hidden sm:inline">{label}</span>
  </button>
 );
}
