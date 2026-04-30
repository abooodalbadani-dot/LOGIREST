import { getMessages } from 'next-intl/server';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const messages = await getMessages();
  
  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <SettingsClient locale={params.locale} />
    </ProtectedRoute>
  );
}
