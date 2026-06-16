import { TransferDisputePageClient } from './TransferDisputePageClient';
import { setRequestLocale } from 'next-intl/server';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function TransferDisputePage(props: { params: Promise<{ locale: 'ar' | 'en'; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);

 return (
  <ProtectedRoute requiredAction="edit" requiredResource="transfer">
   <TransferDisputePageClient id={params.id} locale={params.locale} />
  </ProtectedRoute>
 );
}
