'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * ThemeProvider wrapper using next-themes
 * 
 * Manages the application theme (light/dark).
 * Synchronizes with cookies for server-side persistence to prevent hydration flicker.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Component to synchronize next-themes state with cookies
 */
function ThemeSync() {
  const { theme } = useNextTheme();
  
  useEffect(() => {
    if (theme === 'light' || theme === 'dark') {
      document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }, [theme]);
  
  return null;
}

/**
 * Custom hook to maintain compatibility with existing components
 */
export const useTheme = () => {
  const { theme, setTheme, forcedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only returning theme after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const currentTheme = (forcedTheme || theme) as 'light' | 'dark';

  return {
    theme: mounted ? currentTheme : 'dark', // Fallback to dark during SSR/Hydration
    setTheme: (t: 'light' | 'dark') => setTheme(t),
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    mounted
  };
};
