
import { getTranslations } from 'next-intl/server';
import { BarcodeFormClient } from '../../BarcodeFormClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

interface Props {
 params: Promise<{
 locale: string;
 id: string;
 }>;
}

export async function generateMetadata({ params }: Props) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.barcodes' });
 return {
 title: t('edit_title'),
 };
}

export default async function EditBarcodePage({ params }: Props) {
 const { locale, id } = await params;
 const t = await getTranslations({ locale, namespace: 'master_data.barcodes' });

 return (
 <ProtectedRoute requiredAction="edit" requiredResource="master_data_barcodes">
 <BarcodeFormClient 
 id={id}
 createTitle={t('create_title')}
 editTitle={t('edit_title')}
 viewTitle={t('view_title')}
 locale={locale}
 />
 </ProtectedRoute>
 );
}
