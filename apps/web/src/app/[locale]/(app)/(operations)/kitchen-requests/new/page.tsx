import { getMessages } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { KitchenRequestFormClient } from './KitchenRequestFormClient';

export default async function NewKitchenRequestPage({
 params,
}: {
 params: Promise<{ locale: string }>;
}) {
 const { locale } = await params;
 return (
  <ProtectedRoute requiredAction="create" requiredResource="kitchen_requests">
   <KitchenRequestFormClient locale={locale as 'ar' | 'en'} />
  </ProtectedRoute>
 );
}
