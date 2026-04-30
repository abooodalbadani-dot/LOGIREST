import { getMessages } from 'next-intl/server';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { RolesListClient } from './RolesListClient';

export default async function RolesPage({ params }: { params: { locale: string } }) {
  const messages = await getMessages();
  
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <RolesListClient locale={params.locale} />
    </ProtectedRoute>
  );
}
