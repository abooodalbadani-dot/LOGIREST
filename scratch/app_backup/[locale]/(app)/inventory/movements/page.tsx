import { getTranslations, setRequestLocale } from 'next-intl/server';
import MovementsClient from './MovementsClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function MovementsPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 setRequestLocale(locale);
 

 return (
 <ProtectedRoute requiredAction="view" requiredResource="inventory">
 <MovementsClient />
 </ProtectedRoute>
 );
}
