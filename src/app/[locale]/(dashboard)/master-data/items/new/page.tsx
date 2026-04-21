import { ItemForm } from "@/features/items/components/item-form";

export const metadata = {
  title: "New Item | LogiRest",
  description: "Create a new master catalog item.",
};

export default function NewItemPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Create New Item (SKU)
          </h2>
          <p className="text-muted-foreground mt-2">
            Establish a new master product in the global catalog. This definition will sync across all branches.
          </p>
        </div>
        <ItemForm />
      </div>
    </div>
  );
}
