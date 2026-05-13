import { setRequestLocale, getTranslations } from 'next-intl/server';
import { BarcodeFormClient } from '../BarcodeFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.barcodes' });
 return {
 title: `${t('create_title')} | LogiRest`,
 };
}

export default async function NewBarcodePage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('master_data.barcodes');
 
 return (
 <ProtectedRoute requiredAction="create" requiredResource="master_data_barcodes">
 <BarcodeFormClient
 id={null}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
  viewTitle={t('view_title')}
 locale={params.locale}
 />
 </ProtectedRoute>
 );
}
