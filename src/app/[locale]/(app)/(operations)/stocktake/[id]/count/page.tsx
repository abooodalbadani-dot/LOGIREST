import { StocktakeCountClient } from "./StocktakeCountClient";

export default async function StocktakeCountPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  
  return <StocktakeCountClient id={id} locale={locale as 'ar' | 'en'} />;
}
