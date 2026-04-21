import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PODetailsClient } from "./po-details-client";

export default function PurchaseOrderDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Breadcrumb 
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Purchasing", href: "/purchasing/po" },
          { label: "Purchase Orders", href: "/purchasing/po" },
          { label: params.id },
        ]} 
      />
      <PODetailsClient id={params.id} />
    </div>
  );
}
