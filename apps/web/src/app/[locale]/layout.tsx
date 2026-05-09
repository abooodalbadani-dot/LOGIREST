import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal';
import { WarehouseScopeProvider } from '@/providers/WarehouseScopeProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { cookies } from 'next/headers';
import { UnsavedChangesProvider } from '@/lib/unsaved-changes/UnsavedChangesProvider';
import { ConflictProvider } from '@/providers/ConflictProvider';


import { ibmPlexSans, ibmPlexSansArabic, tajawal, ibmPlexMono, yaModernPro } from '@/lib/fonts';


import { Metadata, Viewport } from 'next';

import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NetworkStatusBanner } from '@/core/network/NetworkStatusBanner';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'LogiRest | Kitchen-Store Inventory System',
  description: 'Enterprise-grade inventory and procurement management for high-volume kitchens.',
  robots: 'index, follow',
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
 width: 'device-width',
 initialScale: 1,
};

export default async function LocaleLayout({
 children,
 params
}: {
 children: React.ReactNode;
 params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  
  console.log(`[Layout] Rendering for locale: ${locale}`);
  console.log(`[Layout] Messages loaded: ${Object.keys(messages).length > 0 ? 'YES' : 'EMPTY'}`);
  if (Object.keys(messages).length === 0) {
    console.error(`[Layout] ERROR: No messages loaded for locale: ${locale}`);
  }

  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value as 'light' | 'dark' || 'light';


 return (
 <html lang={locale} dir={direction} className={theme} suppressHydrationWarning>
 <body className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable} ${ibmPlexMono.variable} ${tajawal.variable} ${yaModernPro.variable}`}>

 <NextIntlClientProvider messages={messages} locale={locale}>
 <QueryProvider>
 <UnsavedChangesProvider>
 <ConflictProvider>
 <AuthProvider>
 <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
 <WarehouseScopeProvider>
 
              <ErrorBoundary>
                <NetworkStatusBanner />
                {children}
                <SessionTimeoutModal />
                <Toaster richColors position={direction === 'rtl' ? 'top-left' : 'top-right'} dir={direction as 'rtl' | 'ltr'} />
              </ErrorBoundary>
 
 </WarehouseScopeProvider>
 </ThemeProvider>
 </AuthProvider>
 </ConflictProvider>
 </UnsavedChangesProvider>
 </QueryProvider>
 </NextIntlClientProvider>
 </body>
 </html>
 );
}
