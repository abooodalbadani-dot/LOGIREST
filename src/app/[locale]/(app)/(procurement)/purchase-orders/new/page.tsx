import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PurchaseOrderForm } from "@/features/purchasing/components/purchase-order-form";

export default function NewPurchaseOrderPage() {
 return (
 <div className="flex-1 space-y-4 p-8 pt-6">
 <Breadcrumb 
 items={[
 { label: "Dashboard", href: "/" },
 { label: "Purchasing", href: "/purchasing/po" },
 { label: "Purchase Orders", href: "/purchasing/po" },
 { label: "New PO" },
 ]} 
 />
 <div>
 <h2 className="text-headline-lg font-bold text-foreground">Create Purchase Order</h2>
 <p className="text-muted-foreground mt-2 mb-8">
 Draft a new purchase order to send to the vendor.
 </p>
 <PurchaseOrderForm />
 </div>
 </div>
 );
}
