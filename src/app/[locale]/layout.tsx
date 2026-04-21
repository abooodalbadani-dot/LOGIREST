import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { SessionTimeoutModal } from '@/components/shared/SessionTimeoutModal';
import { inter, ibmPlexArabic } from '@/lib/fonts';

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
      <body className={`${inter.variable} ${ibmPlexArabic.variable} font-sans`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProvider>
            <AuthProvider>
              {children}
              <SessionTimeoutModal />
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
