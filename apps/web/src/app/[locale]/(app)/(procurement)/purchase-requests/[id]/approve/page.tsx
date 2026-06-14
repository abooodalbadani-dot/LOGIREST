import { setRequestLocale, getTranslations } from 'next-intl/server';
import { PRApprovalClient } from './PRApprovalClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'procurement.pr' });
  return {
    title: `${t('approval.approve_pr')} | Otantik مطاعم`,
  };
}

export default async function PRApprovalPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);

 if (!params.id) {
 notFound();
 }

 return (
 <PRApprovalClient id={params.id} />
 );
}
