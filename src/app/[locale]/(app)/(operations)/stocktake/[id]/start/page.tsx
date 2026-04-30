import { getTranslations } from "next-intl/server";
import { StocktakeStartClient } from "./StocktakeStartClient";

export default async function StocktakeStartPage({
  params
}: {
  params: Promise<{ locale: 'ar' | 'en'; id: string }>;
}) {
  const { locale, id } = await params;
  
  return (
    <StocktakeStartClient id={id} locale={locale} />
  );
}
