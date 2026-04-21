import { getTranslations } from 'next-intl/server';
import StockBalanceClient from './StockBalanceClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function StockBalancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('inventory.balance');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="inventory">
      <StockBalanceClient locale={locale} title={t('title')} />
    </ProtectedRoute>
  );
}
