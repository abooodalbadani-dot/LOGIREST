import { setRequestLocale } from "next-intl/server";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import { StocktakeVarianceClient } from "./StocktakeVarianceClient";

export default async function StocktakeVariancePage(props: {
 params: Promise<{ id: string; locale: string }>;
}) {
 const params = await props.params;
 const { id, locale } = params;
 setRequestLocale(locale);
 
 return (
 <ProtectedRoute requiredAction="view" requiredResource="stocktake">
 <StocktakeVarianceClient id={id} locale={locale as 'ar' | 'en'} />
 </ProtectedRoute>
 );
}
