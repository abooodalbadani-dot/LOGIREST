import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PRFormClient } from './PRFormClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.pr' });
 return {
 title: `${t('edit_pr')} | Otantik مطاعم`,
 };
}

export default async function PREditPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);

 if (!params.id) {
 notFound();
 }

 return (
 <PRFormClient id={params.id} />
 );
}
