import { ItemsClient } from "./items-client";

export const metadata = {
  title: "Items Catalog | LogiRest",
  description: "Manage product catalog, SKUs, and categories.",
};

export default function ItemsPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ItemsClient />
      </div>
    </div>
  );
}
