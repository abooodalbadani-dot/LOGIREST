import { StocktakeForm } from "./stocktake-form";

export const metadata = { title: "بدء جرد جديد | LogiRest" };

export default async function CreateStocktakePage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 return (
 <div className="flex-1 space-y-4 p-8 pt-6">
 <StocktakeForm locale={locale as 'ar' | 'en'} />
 </div>
 );
}
