"use client";

import { useTranslations } from "next-intl";
import { useSuppliers } from "@/features/suppliers/api/useSuppliers";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Supplier } from "@/features/suppliers/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function SuppliersClient() {
  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }
  
  const { data: suppliers, isLoading } = useSuppliers();
  const router = useRouter();

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-neon-cyan">{row.getValue("code")}</span>
    },
    {
      accessorKey: "nameEn",
      header: "Supplier Name",
    },
    {
      accessorKey: "contactPerson",
      header: "Contact Person",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("phone")}</span>
    },
    {
      accessorKey: "status",
      header: t("status") || "Status",
      cell: ({ row }) => {
        return <StatusBadge status={row.getValue("status")} />;
      },
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Suppliers
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage your vendor directory and procurement contacts.
          </p>
        </div>
        <Button onClick={() => router.push('/master-data/suppliers/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>
      
      <div className="mt-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={suppliers || []} 
            searchKey="nameEn"
            searchPlaceholder="Search suppliers..." 
            enableExport 
          />
        )}
      </div>
    </>
  );
}
