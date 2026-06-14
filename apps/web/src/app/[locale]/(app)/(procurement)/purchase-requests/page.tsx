import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PRListClient } from './PRListClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.pr' });
 return {
 title: `${t('title')} | Otantik مطاعم`,
 description: t('description'),
 };
}

export default async function PurchaseRequestsPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
return (
 <PRListClient />
 );
}
