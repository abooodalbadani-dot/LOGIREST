import { StocktakeArchiveClient } from './StocktakeArchiveClient';

interface PageProps {
 params: Promise<{ locale: 'ar' | 'en' }>;
 searchParams: Promise<{
  warehouse_id?: string;
  page?: string;
 }>;
}

export default async function StocktakeArchivePage({ params, searchParams }: PageProps) {
 const { locale } = await params;
 const { warehouse_id, page } = await searchParams;

 return (
  <StocktakeArchiveClient
   initialWarehouseId={warehouse_id}
   initialPage={Number(page) || 1}
   locale={locale}
  />
 );
}
