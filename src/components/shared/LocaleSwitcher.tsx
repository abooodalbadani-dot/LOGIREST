'use client';
import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function LocaleSwitcher() {
 const t = useTranslations('common');
 const params = useParams();
 const pathname = usePathname();
 const router = useRouter();
 
 // Safe hydration handling for locale
 const currentLocale = params?.locale as string || 'ar';
 const otherLocale = currentLocale === 'ar' ? 'en' : 'ar';
 const label = t(`locales.${otherLocale}`);

 const toggleLocale = () => {
 const newPath = pathname.replace(/^\/(ar|en)/, `/ ${otherLocale}`);
 document.cookie = `NEXT_LOCALE=${otherLocale}; path=/`;
 router.replace(newPath || `/ ${otherLocale}`);
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
 className="px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest border border-border-surface rounded-xl text-body-md font-medium transition-colors text-foreground"
 >
 {label}
 </button>
 );
}
