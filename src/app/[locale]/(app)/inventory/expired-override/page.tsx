import { getTranslations } from 'next-intl/server';
import { ExpiredOverrideClient } from './ExpiredOverrideClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

interface Props {
 params: Promise<{
 locale: string;
 }>;
}

export async function generateMetadata({ params }: Props) {
 const { locale } = await params;
 const t = await getTranslations({ locale, namespace: 'inventory.expired_override' });
 return {
 title: `${t('title')} | Culinary Architect`,
 };
}

export default async function ExpiredOverridePage({ params }: Props) {
 const { locale } = await params;

 return (
 <ProtectedRoute requiredAction="view" requiredResource="inventory">
 <ExpiredOverrideClient locale={locale} />
 </ProtectedRoute>
 );
}
