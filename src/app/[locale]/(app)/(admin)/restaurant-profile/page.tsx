import { getMessages } from 'next-intl/server';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { ProfileFormClient } from './ProfileFormClient';

export default async function RestaurantProfilePage({ params }: { params: { locale: string } }) {
  // Ensure messages are loaded for the client
  await getMessages();
  
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <ProfileFormClient locale={params.locale} />
    </ProtectedRoute>
  );
}
