import { PurchaseRequestForm } from "@/features/purchasing/components/purchase-request-form";
import { getTranslations } from "next-intl/server";

export default async function NewPurchaseRequestPage(props: { params: Promise<{ locale: string }> }) {
 await props.params;
 const t = await getTranslations('procurement.pr');

 return (
  <div className="min-w-0 gap-6 flex-1 mx-auto flex-col flex space-y-6 w-full max-w-5xl">
   <div>
    <h2 className="text-headline-lg font-bold text-foreground">{t('create_title')}</h2>
    <p className="text-muted-foreground mt-2">
     {t('create_description')}
    </p>
   </div>

   <PurchaseRequestForm />
  </div>
 );
}
