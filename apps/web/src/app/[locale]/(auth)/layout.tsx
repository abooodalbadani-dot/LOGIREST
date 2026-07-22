import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';

const defaultUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://otantikrestaurant.tech';

const ogImageUrl = `${defaultUrl}/opengraph-image.png`;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  const title = `${t('login.title')} | Otantik مطاعم`;
  const description = 'Secure authentication portal for the Kitchen-Store Inventory System.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${defaultUrl}/${locale}/login`,
      siteName: 'Otantik Restaurant ERP',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'Otantik Restaurant ERP',
        },
      ],
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function AuthLayout({ children }: { children: ReactNode }) {
 return (
  <main className="min-h-screen w-full bg-background relative text-foreground selection:bg-operational-cyan/30">
   {children}
  </main>
 );
}
