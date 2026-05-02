import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PRListClient } from './PRListClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.pr' });
 return {
 title: `${t('title')} | LogiRest`,
 description: t('description') || 'Internal procurement demands and resource acquisition pipeline',
 };
}

export default async function PurchaseRequestsPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('procurement.pr');

 return (
 <PRListClient locale={params.locale as 'ar' | 'en'} />
 );
}
