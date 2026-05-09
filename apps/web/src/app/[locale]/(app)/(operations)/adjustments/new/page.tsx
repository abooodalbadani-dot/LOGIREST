import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdjustmentCreateClient } from './AdjustmentCreateClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'operations.adjustment' });
 return {
 title: `${t('title_new')} | LogiRest`,
 description: 'Manual inventory correction and stock recalibration',
 };
}

export default async function AdjustmentNewPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 const { locale } = params;
 setRequestLocale(locale);

 return (
 <ProtectedRoute requiredAction="create" requiredResource="adjustment">
 <AdjustmentCreateClient locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
