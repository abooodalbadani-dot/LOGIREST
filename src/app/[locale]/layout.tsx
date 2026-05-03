import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal';
import { WarehouseScopeProvider } from '@/providers/WarehouseScopeProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { cookies } from 'next/headers';

import { ibmPlexSans, ibmPlexSansArabic, tajawal, ibmPlexMono } from '@/lib/fonts';

import { Metadata, Viewport } from 'next';
import { WebMCPProvider } from '@/providers/WebMCPProvider';
import '@/app/globals.css';

export const metadata: Metadata = {
 title: 'LogiRest | Kitchen-Store Inventory System',
 description: 'Enterprise-grade inventory and procurement management for high-volume kitchens.',
 robots: 'index, follow',
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
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <body className={locale === 'ar' ? tajawal.className : ibmPlexSans.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <WarehouseScopeProvider>
                  <WebMCPProvider>
                    {children}
                    <SessionTimeoutModal />
                    <Toaster position="top-center" richColors closeButton />
                  </WebMCPProvider>
                </WarehouseScopeProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

