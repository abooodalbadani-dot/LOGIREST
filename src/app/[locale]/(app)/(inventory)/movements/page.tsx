import { getTranslations } from 'next-intl/server';
import MovementsClient from './MovementsClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function MovementsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('inventory.movements');

  return (
    <ProtectedRoute requiredAction="view" requiredResource="inventory">
      <MovementsClient locale={locale} title={t('title')} />
    </ProtectedRoute>
  );
}
