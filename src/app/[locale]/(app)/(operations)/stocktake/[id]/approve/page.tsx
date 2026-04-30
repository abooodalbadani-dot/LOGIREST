import { StocktakeApproveClient } from "./StocktakeApproveClient";

export default async function StocktakeApprovePage({
  params,
}: {
  params: Promise<{ id: string; locale: "ar" | "en" }>;
}) {
  const { id, locale } = await params;
  return <StocktakeApproveClient id={id} locale={locale} />;
}
