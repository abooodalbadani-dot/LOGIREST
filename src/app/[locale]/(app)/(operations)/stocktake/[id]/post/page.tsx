import { StocktakePostClient } from "./StocktakePostClient";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default async function StocktakePostPage({
 params,
}: {
 params: Promise<{ id: string; locale: "ar" | "en" }>;
}) {
 const { id, locale } = await params;
 return (
 <ProtectedRoute requiredResource="stocktake" requiredAction="post">
 <StocktakePostClient id={id} locale={locale} />
 </ProtectedRoute>
 );
}
