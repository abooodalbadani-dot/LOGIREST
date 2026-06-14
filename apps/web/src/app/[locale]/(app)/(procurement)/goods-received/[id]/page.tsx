import { GRNDetailClient } from './GRNDetailClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
 const { locale, id } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.grn' });
 const isNew = id === 'new';
 return {
 title: `${isNew ? t('create_new') : t('detail_title')} | Otantik مطاعم`,
 description: isNew ? t('new_manifest_sub') : t('detail_sub'),
 };
}

export default async function GoodsReceivedDetailPage(props: { params: Promise<{ locale: string, id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 const isNew = params.id === 'new';

 return (
 <ProtectedRoute requiredAction={isNew ? "create" : "view"} requiredResource="grn">
 <GRNDetailClient id={params.id} />
 </ProtectedRoute>
 );
}
