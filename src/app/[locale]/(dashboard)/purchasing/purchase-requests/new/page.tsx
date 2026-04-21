import { PurchaseRequestForm } from "@/features/purchasing/components/pr-form";

export default function NewPurchaseRequestPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Create Purchase Request</h2>
        <p className="text-muted-foreground mt-2">
          Submit a new request for items needed by your branch.
        </p>
      </div>

      <PurchaseRequestForm />
    </div>
  );
}
