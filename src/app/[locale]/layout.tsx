import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal';
import { WarehouseScopeProvider } from '@/providers/WarehouseScopeProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { cookies } from 'next/headers';

import { inter, cairo } from '@/lib/fonts';

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
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value as 'light' | 'dark' || 'dark';


  return (
    <html lang={locale} dir={direction} className={theme} suppressHydrationWarning>
      <body className={`${cairo.variable} ${inter.variable} font-sans`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
                <WarehouseScopeProvider>
                  <WebMCPProvider>
                    {children}
                    <SessionTimeoutModal />
                    <Toaster richColors position="top-center" dir={direction as 'rtl' | 'ltr'} />
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
