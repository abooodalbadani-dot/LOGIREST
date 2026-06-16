import { setRequestLocale } from 'next-intl/server';
import { POListClient } from './POListClient';

export default async function POListPage({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 setRequestLocale(locale);
 return <POListClient locale={locale as "ar" | "en"} />;
}
