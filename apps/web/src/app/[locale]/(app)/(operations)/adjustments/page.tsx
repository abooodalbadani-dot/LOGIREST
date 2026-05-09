import { setRequestLocale } from 'next-intl/server';
import { AdjustmentListClient } from './AdjustmentListClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function AdjustmentsPage(props: { params: Promise<{ locale: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);

 return (
 <ProtectedRoute requiredAction="view" requiredResource="adjustment">
 <AdjustmentListClient />
 </ProtectedRoute>
 );
}
