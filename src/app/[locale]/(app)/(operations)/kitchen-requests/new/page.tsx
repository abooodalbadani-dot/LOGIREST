import { getMessages } from 'next-intl/server';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { KitchenRequestFormClient } from './KitchenRequestFormClient';

export default async function NewKitchenRequestPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  return (
    <ProtectedRoute permissions={['CREATE_KITCHEN_REQUEST']}>
      <KitchenRequestFormClient locale={locale as 'ar' | 'en'} />
    </ProtectedRoute>
  );
}
