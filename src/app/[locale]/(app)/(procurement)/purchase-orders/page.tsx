import { POListClient } from './POListClient';

export default async function POListPage({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  return <POListClient locale={locale as 'ar' | 'en'} />;
}
