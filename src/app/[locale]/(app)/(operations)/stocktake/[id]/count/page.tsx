import { StocktakeCountClient } from "./StocktakeCountClient";
import ProtectedRoute from "@/components/shared/ProtectedRoute";

export default async function StocktakeCountPage({
 params,
}: {
 params: Promise<{ id: string; locale: string }>;
}) {
 const { id, locale } = await params;
 
 return (
 <ProtectedRoute requiredResource="stocktake" requiredAction="edit">
 <StocktakeCountClient id={id} locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
