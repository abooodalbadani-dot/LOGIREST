import { setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { RolesViewerClient } from '../RolesViewerClient';

export default async function RolesMatrixPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  
  return (
    <ProtectedRoute requiredAction="view" requiredResource="admin">
      <RolesViewerClient />
    </ProtectedRoute>
  );
}
