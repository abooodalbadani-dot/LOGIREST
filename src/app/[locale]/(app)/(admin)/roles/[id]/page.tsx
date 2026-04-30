import { getMessages } from 'next-intl/server';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { RoleDetailClient } from './RoleDetailClient';

export default async function RoleDetailPage({ params }: { params: { locale: string; id: string } }) {
  const messages = await getMessages();
  
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <RoleDetailClient locale={params.locale} id={params.id} />
    </ProtectedRoute>
  );
}
