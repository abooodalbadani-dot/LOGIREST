import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';
import { WebMCPBadge } from '@/components/shared/WebMCPBadge';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return {
    title: `${t('login.title')} | LogiRest`,
    description: 'Secure authentication portal for the Kitchen-Store Inventory System.',
  };
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex w-full bg-background relative overflow-hidden text-foreground font-sans">
      {/* Universal WebMCP Header for Auth */}
      <header className="absolute top-0 end-0 z-50 p-6 pointer-events-none">
        <div className="pointer-events-auto scale-90 origin-top-right">
          <WebMCPBadge />
        </div>
      </header>

      {children}
    </div>
  );
}
