import { StocktakeVarianceClient } from "./StocktakeVarianceClient";

export default async function StocktakeVariancePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  
  return <StocktakeVarianceClient id={id} locale={locale as 'ar' | 'en'} />;
}
