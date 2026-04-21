"use client";

import { useTranslations } from "next-intl";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { useBranches } from "@/features/branches/api/useBranches";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Warehouse } from "@/features/warehouses/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function WarehousesClient() {
  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }
  
  const { data: warehouses, isLoading: isWLoading } = useWarehouses();
  const { data: branches, isLoading: isBLoading } = useBranches();
  const router = useRouter();

  const getBranchName = (branchId: string) => {
    const branch = branches?.find(b => b.id === branchId);
    return branch ? branch.nameEn : branchId;
  }

  const columns: ColumnDef<Warehouse>[] = [
    {
      accessorKey: "code",
      header: t("code") || "Code",
    },
    {
      accessorKey: "nameEn",
      header: "Warehouse Name",
    },
    {
      accessorKey: "branchId",
      header: "Parent Branch",
      cell: ({ row }) => getBranchName(row.getValue("branchId")),
    },
    {
      accessorKey: "type",
      header: t("type") || "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        // Visual indicator could be added here
        return <span className="text-xs font-semibold px-2 py-1 bg-surface-3 rounded-md">{type}</span>;
      }
    },
    {
      accessorKey: "status",
      header: t("status") || "Status",
      cell: ({ row }) => {
        return <StatusBadge status={row.getValue("status")} />;
      },
    },
  ];

  const isLoading = isWLoading || isBLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Warehouses
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage storage locations and associated organizational branches.
          </p>
        </div>
        <Button onClick={() => router.push('/master-data/warehouses/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Warehouse
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
            data={warehouses || []} 
            searchKey="nameEn"
            searchPlaceholder="Search warehouses..." 
            enableExport 
          />
        )}
      </div>
    </>
  );
}
