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
  const title = `مطاعم أوتانتك | Otantik Restaurant`;
  const description = 'Enterprise-grade inventory and procurement management for high-volume kitchens.';

  return {
    metadataBase: new URL(defaultUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      url: defaultUrl,
      siteName: 'Otantik Restaurant ERP',
      images: [
        {
          url: ogImageUrl,
          secureUrl: ogImageUrl,
          type: 'image/png',
          width: 1200,
          height: 630,
          alt: 'مطاعم أوتانتك | Otantik Restaurant',
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
