import { WarehouseForm } from "@/features/warehouses/components/warehouse-form";

export const metadata = {
  title: "New Warehouse | LogiRest",
  description: "Create a new warehouse location.",
};

export default function NewWarehousePage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create New Warehouse
          </h2>
          <p className="text-muted-foreground mt-2">
            Configure a new storage location and assign it to an operating branch.
          </p>
        </div>
        <WarehouseForm />
      </div>
    </div>
  );
}
