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
   <div className="w-9 h-9 rounded-xl bg-card border border-border shadow-sm animate-pulse" />
  );
 }

 const handleToggle = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  updateProfile({ themePreferences: newTheme });
 };

 return (
  <button
   onClick={handleToggle}
   className="p-2 text-muted-foreground/60 hover:text-operational-cyan hover:bg-operational-cyan/10 rounded-xl transition-all group relative overflow-hidden"
   aria-label={t('ui.toggle_theme')}
  >
   <div className="absolute inset-0 bg-operational-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
   
   <div className="relative z-10">
    {theme === 'dark' ? (
     <Sun className="w-5 h-5 group-hover:rotate-45 transition-transform duration-200" />
    ) : (
     <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-200" />
    )}
   </div>
  </button>
 );
}
