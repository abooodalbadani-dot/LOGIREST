import { getMessages } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { KitchenRequestFormClient } from './KitchenRequestFormClient';

export default async function NewKitchenRequestPage({
 params: { locale }
}: {
 params: { locale: string }
}) {
 return (
 <ProtectedRoute requiredAction="create" requiredResource="issue">
 <KitchenRequestFormClient locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
