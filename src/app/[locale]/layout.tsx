import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal';
import { WarehouseScopeProvider } from '@/providers/WarehouseScopeProvider';
import { inter, ibmPlexArabic, tajawal } from '@/lib/fonts';

import { Metadata } from 'next';
import { WebMCPProvider } from '@/providers/WebMCPProvider';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'LogiRest | Kitchen-Store Inventory System',
  description: 'Enterprise-grade inventory and procurement management for high-volume kitchens.',
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
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

  return (
    <html lang={locale} dir={direction} className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${ibmPlexArabic.variable} ${tajawal.variable} font-sans`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProvider>
            <AuthProvider>
              <WarehouseScopeProvider>
                <WebMCPProvider>
                  {children}
                  <SessionTimeoutModal />
                  <Toaster richColors position="top-center" dir={direction as 'rtl' | 'ltr'} />
                </WebMCPProvider>
              </WarehouseScopeProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
