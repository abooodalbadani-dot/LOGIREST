import { getTranslations } from 'next-intl/server';
import { POApproveClient } from './POApproveClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

interface Props {
 params: Promise<{
 locale: string;
 id: string;
 }>;
}

export async function generateMetadata({ params }: Props) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'procurement.po' });
 return {
 title: `${t('approval.title')} | Culinary Architect`,
 };
}

export default async function POApprovePage({ params }: Props) {
 const { locale, id } = await params;

 return (
 <ProtectedRoute requiredAction="approve" requiredResource="po">
 <POApproveClient id={id} />
 </ProtectedRoute>
 );
}
