import { PRDetailClient } from './PRDetailClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
 const { locale, id } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.pr' });
 const isNew = id === 'new';
 return {
 title: `${isNew ? t('create_new') : t('detail_title')} | Otantik مطاعم`,
 description: isNew ? t('commitment_intent') : t('specification'),
 };
}

export default async function PurchaseRequestDetailPage(props: { params: Promise<{ locale: string, id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 const isNew = params.id === 'new';

 return (
 <ProtectedRoute requiredAction={isNew ? "create" : "view"} requiredResource="procurement_pr">
 <PRDetailClient id={isNew ? null : params.id} />
 </ProtectedRoute>
 );
}
