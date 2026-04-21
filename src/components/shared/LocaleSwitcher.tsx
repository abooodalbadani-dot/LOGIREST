'use client';
import { useParams, usePathname, useRouter } from 'next/navigation';

export default function LocaleSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  
  let currentLocale = 'ar';
  if (params && params.locale) {
    currentLocale = params.locale as string;
  } else if (typeof document !== 'undefined') {
    currentLocale = document.documentElement.lang || 'ar';
  }

  const otherLocale = currentLocale === 'ar' ? 'en' : 'ar';
  const label = currentLocale === 'ar' ? 'EN' : 'عر';

  const toggleLocale = () => {
    const newPath = pathname.replace(/^\/(ar|en)/, `/${otherLocale}`);
    document.cookie = `NEXT_LOCALE=${otherLocale}; path=/`;
    router.replace(newPath || `/${otherLocale}`);
  };

  return (
    <button 
      onClick={toggleLocale}
      className="px-3 py-1 bg-surface-2 hover:bg-surface-3 border border-surface-3 rounded text-sm font-medium transition-colors text-on-surface"
    >
      {label}
    </button>
  );
}
