"use client";

import { useTranslations } from "next-intl";
import { useItems } from "@/features/items/api/useItems";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Item } from "@/features/items/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function ItemsClient() {
  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }
  
  const { data: items, isLoading } = useItems();
  const router = useRouter();

  const columns: ColumnDef<Item>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-brand-primary">{row.getValue("sku")}</span>
    },
    {
      accessorKey: "nameEn",
      header: "Item Name",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        return <span className="text-xs font-semibold px-2 py-1 bg-surface-3 rounded-md text-muted-foreground">{row.getValue("category")}</span>;
      }
    },
    {
      accessorKey: "costPrice",
      header: "Unit Cost",
      cell: ({ row }) => {
        const cost = parseFloat(row.getValue("costPrice"));
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cost);
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

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Items Catalog
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage your master list of SKUs and product variations.
          </p>
        </div>
        <Button onClick={() => router.push('/master-data/items/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
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
            data={items || []} 
            searchKey="nameEn"
            searchPlaceholder="Search items..." 
            enableExport 
          />
        )}
      </div>
    </>
  );
}
