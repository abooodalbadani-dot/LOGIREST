"use client";

import { useTranslations } from "next-intl";
import { useBranches } from "@/features/branches/api/useBranches";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Branch } from "@/features/branches/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function BranchesClient() {
  const t = useTranslations("common");
  const { data: branches, isLoading } = useBranches();
  const router = useRouter();

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: "code",
      header: t("code") || "Code",
    },
    {
      accessorKey: "nameEn",
      header: "Name (EN)",
    },
    {
      accessorKey: "nameAr",
      header: "Name (AR)",
    },
    {
      accessorKey: "status",
      header: t("status") || "Status",
      cell: ({ row }) => {
        return <StatusBadge status={row.getValue("status")} />;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        return new Date(row.getValue("createdAt") as string).toLocaleDateString();
      },
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Branches
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage your operating branches and locations.
          </p>
        </div>
        <Button onClick={() => router.push('/master-data/branches/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
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
            data={branches || []} 
            searchKey="nameEn" 
            enableExport 
          />
        )}
      </div>
    </>
  );
}
