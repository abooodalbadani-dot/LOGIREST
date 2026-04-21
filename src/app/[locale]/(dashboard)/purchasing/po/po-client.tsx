"use client";

import { useTranslations } from "next-intl";
import { usePurchaseOrders } from "@/features/purchasing/api/usePurchaseOrders";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PurchaseOrder } from "@/features/purchasing/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function PurchaseOrdersClient() {
  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }
  
  const { data: pos, isLoading } = usePurchaseOrders();
  const router = useRouter();

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: "poNumber",
      header: "PO Number",
      cell: ({ row }) => (
        <Link href={`/purchasing/po/${row.original.id}`} className="font-mono text-brand-primary font-medium hover:underline">
          {row.getValue("poNumber")}
        </Link>
      )
    },
    {
      accessorKey: "supplierId",
      header: "Supplier",
    },
    {
      accessorKey: "expectedDate",
      header: "Expected Delivery",
      cell: ({ row }) => {
        const dateStr = row.getValue("expectedDate") as string;
        return <span>{new Date(dateStr).toLocaleDateString()}</span>;
      }
    },
    {
      accessorKey: "supplierTotalAmount",
      header: "Supplier Total",
      cell: ({ row }) => {
        const cost = parseFloat(row.getValue("supplierTotalAmount"));
        const cur = row.original.supplierCurrency;
        return <span className="font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(cost)}</span>;
      }
    },
    {
      accessorKey: "baseTotalAmount",
      header: "Base Total (SAR)",
      cell: ({ row }) => {
        const cost = parseFloat(row.getValue("baseTotalAmount"));
        return <span className="font-mono text-brand-primary">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cost)}</span>;
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
            Purchase Orders
          </h2>
          <p className="text-muted-foreground mt-2">
            Manage vendor purchase orders, track approvals, and monitor delivery status.
          </p>
        </div>
        <Button onClick={() => router.push('/purchasing/po/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create PO
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
            data={pos || []} 
            searchKey="poNumber"
            searchPlaceholder="Search by PO Number..." 
          />
        )}
      </div>
    </>
  );
}
