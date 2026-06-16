import { StocktakeForm } from "./stocktake-form";

export const metadata = { title: "بدء جرد جديد | Otantik مطاعم" };

export default async function CreateStocktakePage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 return (
 <div className="space-y-4 min-w-0 gap-6 flex-1 p-8 pt-6 flex flex-col w-full">
 <StocktakeForm locale={locale as 'ar' | 'en'} />
 </div>
 );
}
