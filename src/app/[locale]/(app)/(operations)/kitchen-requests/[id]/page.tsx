import { setRequestLocale } from 'next-intl/server';
import { KitchenRequestDetailClient } from './KitchenRequestDetailClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function KitchenRequestDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <ProtectedRoute requiredAction="view" requiredResource="kitchen_requests">
      <KitchenRequestDetailClient id={id} locale={locale as 'ar' | 'en'} />
    </ProtectedRoute>
  );
}
