import { StocktakePostClient } from "./StocktakePostClient";

export default async function StocktakePostPage({
  params,
}: {
  params: Promise<{ id: string; locale: "ar" | "en" }>;
}) {
  const { id, locale } = await params;
  return <StocktakePostClient id={id} locale={locale} />;
}
