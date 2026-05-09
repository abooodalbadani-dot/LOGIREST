import { StocktakeApproveClient } from "./StocktakeApproveClient";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default async function StocktakeApprovePage({
 params,
}: {
 params: Promise<{ id: string; locale: "ar" | "en" }>;
}) {
 const { id, locale } = await params;
 return (
 <ProtectedRoute requiredResource="stocktake" requiredAction="approve">
 <StocktakeApproveClient id={id} locale={locale} />
 </ProtectedRoute>
 );
}
