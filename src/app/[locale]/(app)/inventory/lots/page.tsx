import { getTranslations, setRequestLocale } from 'next-intl/server';
import LotBalanceClient from './LotBalanceClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function LotBalancesPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 setRequestLocale(locale);
 const t = await getTranslations('inventory.lots');

 return (
 <ProtectedRoute requiredAction="view" requiredResource="inventory_lots">
 <LotBalanceClient />
 </ProtectedRoute>
 );
}
