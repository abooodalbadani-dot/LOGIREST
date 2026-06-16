import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdjustmentCreateClient } from './AdjustmentCreateClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Suspense } from 'react';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'operations.adjustment' });
 return {
 title: `${t('title_new')} | Otantik مطاعم`,
 description: 'Manual inventory correction and stock recalibration',
 };
}

export default async function AdjustmentNewPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 const { locale } = params;
 setRequestLocale(locale);

 return (
 <ProtectedRoute requiredAction="create" requiredResource="adjustment">
  <Suspense fallback={<div>Loading...</div>}>
   <AdjustmentCreateClient locale={locale as 'ar' | 'en'} />
  </Suspense>
 </ProtectedRoute>
 );
}
