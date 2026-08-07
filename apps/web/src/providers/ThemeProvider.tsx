'use client';

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect, useState } from 'react';

// Suppress React 19 "script tag" warning from next-themes in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (args.length === 0) return;
    const firstArg = args[0];
    if (firstArg === null || firstArg === undefined || firstArg === '') return;
    if (typeof firstArg === 'string') {
      if (
        firstArg.includes('Encountered a script tag') ||
        firstArg.includes('Extra attributes from the server') ||
        firstArg.includes('did not match') ||
        firstArg.includes('Hydration failed')
      ) {
        return;
      }
    }
    orig(...args);
  };
}


/**
 * ThemeProvider wrapper using next-themes
 * 
 * Manages the application theme (light/dark).
 * Synchronizes with cookies for server-side persistence to prevent hydration flicker.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      {...props} 
      enableSystem={false}
      disableTransitionOnChange
    >
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
  
 setMounted(true);
 }, []);

 const currentTheme = (forcedTheme || theme) as 'light' | 'dark';

 return {
    theme: mounted ? currentTheme : undefined, // Return undefined during SSR/Hydration to prevent mismatch
 setTheme: (t: 'light' | 'dark') => setTheme(t),
 toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
 mounted
 };
};
