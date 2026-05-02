import { PurchaseRequestForm } from "@/features/purchasing/components/pr-form";

export default async function NewPurchaseRequestPage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 return (
 <div className="max-w-5xl mx-auto space-y-6">
 <div>
 <h2 className="text-headline-lg font-bold text-foreground">Create Purchase Request</h2>
 <p className="text-muted-foreground mt-2">
 Submit a new request for items needed by your branch.
 </p>
 </div>

 <PurchaseRequestForm locale={locale as 'ar' | 'en'} />
 </div>
 );
}
