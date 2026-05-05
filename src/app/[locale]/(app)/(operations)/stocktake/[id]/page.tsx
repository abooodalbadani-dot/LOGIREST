import { StocktakeDetailClient } from './StocktakeDetailClient';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, id: string }> }) {
 const { locale, id } = await params;
 const t = await getTranslations({ locale, namespace: 'operations.stocktake' });
 return {
 title: `${t('detail_title')} | LogiRest`,
 description: t('detail_title'),
 };
}

export default async function StocktakeDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="stocktake">
 <StocktakeDetailClient id={params.id} />
 </ProtectedRoute>
 );
}
