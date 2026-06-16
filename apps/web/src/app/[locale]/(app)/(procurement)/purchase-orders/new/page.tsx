
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PurchaseOrderForm } from "@/features/purchasing/components/purchase-order-form";
import { useTranslations } from "next-intl";

export default function NewPurchaseOrderPage() {
 const t = useTranslations('procurement.po');
 const tCommon = useTranslations('common');
 const tDashboard = useTranslations('dashboard');

 return (
 <div className="space-y-4 min-w-0 gap-6 flex-1 p-8 pt-6 flex flex-col w-full">
 <Breadcrumb 
 items={[
 { label: tDashboard('title'), href: "/" },
 { label: tCommon('purchasing'), href: "/purchase-orders" },
 { label: tCommon('purchase_orders'), href: "/purchase-orders" },
 { label: t('breadcrumb.new_po') },
 ]} 
 />
 <div>
 <h2 className="text-headline-lg font-bold text-foreground">{t('create_title')}</h2>
 <p className="text-muted-foreground mt-2 mb-8">
 {t('create_subtitle')}
 </p>
 <PurchaseOrderForm />
 </div>
 </div>
 );
}
