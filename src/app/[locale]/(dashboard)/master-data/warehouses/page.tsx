import { WarehousesClient } from "./warehouses-client";

export const metadata = {
  title: "Warehouses | LogiRest",
  description: "Manage storage locations and virtual warehouses.",
};

export default function WarehousesPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <WarehousesClient />
      </div>
    </div>
  );
}
