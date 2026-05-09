import { getTranslations } from 'next-intl/server';
import { ReactNode } from 'react';


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
 <div className="min-h-screen flex w-full bg-background relative overflow-hidden text-foreground">


 {children}
 </div>
 );
}
