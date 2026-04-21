import { SuppliersClient } from "./suppliers-client";

export const metadata = {
  title: "Suppliers | LogiRest",
  description: "Manage supplier directory and vendor relations.",
};

export default function SuppliersPage() {
  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SuppliersClient />
      </div>
    </div>
  );
}
