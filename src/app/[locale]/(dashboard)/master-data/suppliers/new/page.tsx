import { SupplierForm } from "@/features/suppliers/components/supplier-form";

export const metadata = {
  title: "New Supplier | LogiRest",
  description: "Create a new supplier profile.",
};

export default function NewSupplierPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Register New Supplier
          </h2>
          <p className="text-muted-foreground mt-2">
            Add a new external vendor into the corporate directory.
          </p>
        </div>
        <SupplierForm />
      </div>
    </div>
  );
}
