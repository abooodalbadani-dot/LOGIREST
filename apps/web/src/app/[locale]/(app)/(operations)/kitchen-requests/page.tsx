import { setRequestLocale } from 'next-intl/server';
import { KitchenRequestsListClient } from './KitchenRequestsListClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function KitchenRequestsPage({
 params,
 searchParams,
}: {
 params: Promise<{ locale: string }>;
 searchParams: Promise<{ status?: string; department_id?: string; page?: string; search?: string; limit?: string }>;
}) {
 const { locale } = await params;
 const { status, department_id, page, search, limit } = await searchParams;
 setRequestLocale(locale);

 return (
 <ProtectedRoute requiredAction="view" requiredResource="kitchen_requests">
 <KitchenRequestsListClient
  initialStatus={status}
  initialDepartmentId={department_id}
  initialPage={Number(page ?? 1)}
  initialSearch={search || ''}
  initialLimit={Number(limit ?? 50)}
  locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
