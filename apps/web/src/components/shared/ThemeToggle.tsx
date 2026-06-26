'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { useUserProfile } from '@/providers/UserProfileProvider';
import { Sun, Moon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
 const t = useTranslations('common');
 const { theme, mounted } = useTheme();
 const { updateProfile } = useUserProfile();
 
  if (!mounted) {
   return (
    <div className="w-9 h-9 rounded-lg bg-transparent animate-pulse" />
   );
  }

  const handleToggle = () => {
   const newTheme = theme === 'dark' ? 'light' : 'dark';
   updateProfile({ themePreferences: newTheme });
  };

  return (
   <button
    onClick={handleToggle}
    className="p-2 text-[#0B1220] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A2234] rounded-lg transition-colors group shrink-0"
    aria-label={t('ui.toggle_theme')}
   >
    <div className="relative z-10 flex shrink-0">
     {theme === 'dark' ? (
      <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-200 shrink-0" />
     ) : (
      <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-200 shrink-0" />
     )}
    </div>
   </button>
  );
}
