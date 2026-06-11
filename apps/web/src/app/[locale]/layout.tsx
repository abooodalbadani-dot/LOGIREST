import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { isConfigValid } from '@/lib/config-check';

import { WarehouseScopeProvider } from '@/providers/WarehouseScopeProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { cookies } from 'next/headers';
import { UnsavedChangesProvider } from '@/lib/unsaved-changes/UnsavedChangesProvider';
import { ConflictProvider } from '@/providers/ConflictProvider';
import { ConfirmationProvider } from '@/providers/ConfirmationProvider';
import { ErrorProvider } from '@/providers/ErrorProvider';


import { UserProfileProvider } from '@/providers/UserProfileProvider';
import { CurrencyProvider } from '@/app/[locale]/providers/currency-provider';


import { ibmPlexSans, ibmPlexSansArabic, cairo, ibmPlexMono } from '@/lib/fonts';


import { Metadata, Viewport } from 'next';

import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { NetworkStatusBanner } from '@/core/network/NetworkStatusBanner';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'لوجي ريست | LogiRest',
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
  if (!isConfigValid(process.env)) {
    return (
      <html lang="en" className="dark">
        <head>
          <title>Configuration Error | LogiRest</title>
          <style>{`
            body {
              margin: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background-color: #0b0f19;
              color: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              overflow: hidden;
            }
            .card {
              max-width: 500px;
              width: 90%;
              padding: 2.5rem;
              background: rgba(17, 24, 39, 0.7);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(239, 68, 68, 0.2);
              border-radius: 16px;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.05);
              text-align: center;
              animation: float 6s ease-in-out infinite;
            }
            .icon {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background: rgba(239, 68, 68, 0.1);
              color: #ef4444;
              font-size: 2rem;
              margin-bottom: 1.5rem;
              border: 1px solid rgba(239, 68, 68, 0.2);
            }
            h1 {
              font-size: 1.5rem;
              font-weight: 700;
              margin: 0 0 1rem 0;
              letter-spacing: -0.025em;
              background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            p {
              font-size: 0.95rem;
              line-height: 1.6;
              color: #94a3b8;
              margin: 0 0 2rem 0;
            }
            .code-block {
              font-family: 'Courier New', Courier, monospace;
              background: #070a13;
              padding: 1rem;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.05);
              font-size: 0.85rem;
              color: #ef4444;
              text-align: left;
              margin-bottom: 1.5rem;
              overflow-x: auto;
            }
            .badge {
              display: inline-block;
              padding: 0.25rem 0.75rem;
              border-radius: 9999px;
              font-size: 0.75rem;
              font-weight: 600;
              background: rgba(239, 68, 68, 0.15);
              color: #f87171;
              margin-bottom: 1rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .footer {
              font-size: 0.75rem;
              color: #475569;
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </head>
        <body>
          <div className="card">
            <div className="icon">⚠️</div>
            <div className="badge">Config Error</div>
            <h1>Observability & Safety Blocker</h1>
            <p>
              The frontend application failed to initialize because the primary API Gateway URL is undefined in the environment.
            </p>
            <div className="code-block">
              FATAL: NEXT_PUBLIC_API_URL is missing
            </div>
            <div className="footer">
              LogiRest Enterprise Engine v16.2.6
            </div>
          </div>
        </body>
      </html>
    );
  }

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
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body 
        className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable} ${ibmPlexMono.variable} ${cairo.variable}`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <QueryProvider>
              <UnsavedChangesProvider>
                <ConflictProvider>
                  <ConfirmationProvider>
                    <AuthProvider>
                      <UserProfileProvider>
                        <WarehouseScopeProvider>
                          <CurrencyProvider>
                          <ErrorBoundary>
                            <NetworkStatusBanner />
                            <ErrorProvider>
                              {children}
                            </ErrorProvider>
                            <Toaster richColors position={direction === 'rtl' ? 'top-left' : 'top-right'} dir={direction as 'rtl' | 'ltr'} />
                          </ErrorBoundary>
                          </CurrencyProvider>
                        </WarehouseScopeProvider>
                      </UserProfileProvider>
                    </AuthProvider>
                  </ConfirmationProvider>
                </ConflictProvider>
              </UnsavedChangesProvider>
            </QueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
