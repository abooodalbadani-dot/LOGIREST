import { setRequestLocale } from 'next-intl/server';
import StockBalanceClient from './StockBalanceClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function StockBalancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
  <ProtectedRoute requiredAction="view" requiredResource="inventory">
  <StockBalanceClient />
  </ProtectedRoute>
  );
}
