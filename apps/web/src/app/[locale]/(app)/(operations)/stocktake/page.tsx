import { setRequestLocale } from 'next-intl/server';
import { StocktakeListClient } from './StocktakeListClient';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export default async function StocktakeListPage({
 params,
 searchParams,
}: {
 params: Promise<{ locale: string }>;
 searchParams: Promise<{ status?: string; page?: string; warehouse_id?: string }>;
}) {
 const { locale } = await params;
 const { status, page, warehouse_id } = await searchParams;
 setRequestLocale(locale);

 return (
 <ProtectedRoute requiredAction="view" requiredResource="stocktake">
 <StocktakeListClient
 initialStatus={status}
 initialPage={Number(page ?? 1)}
 initialWarehouseId={warehouse_id}
 locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
