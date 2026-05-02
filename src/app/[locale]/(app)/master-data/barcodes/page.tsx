import { BarcodeListClient } from './BarcodeListClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageHeader } from '@/components/shared/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'masterData.barcodes' });
 return {
 title: `${t('title')} | LogiRest`,
 description: 'Item barcode and label management',
 };
}

export default async function BarcodesPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 const t = await getTranslations('masterData.barcodes');
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="master_data">
 <div className="flex flex-col gap-6">
 <PageHeader 
 title={t('title')} 
 description="Item barcode and label management"
 />
 <BarcodeListClient locale={params.locale} />
 </div>
 </ProtectedRoute>
 );
}
