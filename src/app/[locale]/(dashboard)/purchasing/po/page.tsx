import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PurchaseOrdersClient } from "./po-client";

export default function PurchaseOrdersPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Breadcrumb 
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Purchasing", href: "/purchasing/po" },
          { label: "Purchase Orders" },
        ]} 
      />
      <PurchaseOrdersClient />
    </div>
  );
}
