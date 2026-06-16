import { setRequestLocale } from 'next-intl/server';
import { SupplierProfileClient } from './SupplierProfileClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function SupplierProfilePage({
 params,
}: {
 params: Promise<{ locale: string; id: string }>;
}) {
 const { locale, id } = await params;
 setRequestLocale(locale);
 
 return (
  <ProtectedRoute requiredAction="view" requiredResource="master_data_suppliers">
   <SupplierProfileClient locale={locale} id={id} />
  </ProtectedRoute>
 );
}
