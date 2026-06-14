import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import ScannerClient from './ScannerClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'operational.inventory' });
 return {
 title: `${t('barcode_scanner')} | Otantik مطاعم`,
 };
}

export default async function ScannerPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);

 return (
 <ProtectedRoute requiredAction="view" requiredResource="inventory">
 <ScannerClient />
 </ProtectedRoute>
 );
}
