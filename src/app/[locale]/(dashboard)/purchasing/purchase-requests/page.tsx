import { PurchaseRequestsClient } from "./pr-client";

export const metadata = {
  title: "Purchase Requests | LogiRest",
  description: "Manage internal purchase requests and approvals.",
};

export default function PurchaseRequestsPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseRequestsClient />
      </div>
    </div>
  );
}
