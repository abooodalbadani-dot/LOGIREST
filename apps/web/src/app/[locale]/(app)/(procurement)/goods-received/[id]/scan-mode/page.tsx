import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { GRNScanClient } from './GRNScanClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.grn' });
 
 return {
 title: `${t('scan_mode')} | LogiRest`,
 description: t('scan_mode_sub'),
 };
}

export default async function GoodsReceivedScanPage(props: { params: Promise<{ locale: string, id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);

 if (process.env.NODE_ENV !== 'development') {
  return null;
 }

 return (
 <ProtectedRoute requiredAction="update" requiredResource="grn">
 <GRNScanClient id={params.id} locale={params.locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
