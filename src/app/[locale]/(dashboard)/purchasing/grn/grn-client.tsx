"use client";

import { useGoodsReceipts } from "@/features/purchasing/api/useGoodsReceipts";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { GoodsReceipt } from "@/features/purchasing/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function GoodsReceiptsClient() {
  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }
  
  const { data: grns, isLoading } = useGoodsReceipts();
  const router = useRouter();

  const columns: ColumnDef<GoodsReceipt>[] = [
    {
      accessorKey: "grnNumber",
      header: "GRN Number",
      cell: ({ row }) => (
        <Link href={`/purchasing/grn/${row.original.id}`} className="font-mono text-brand-primary font-medium hover:underline">
          {row.getValue("grnNumber")}
        </Link>
      )
    },
    {
      accessorKey: "poId",
      header: "PO Ref",
      cell: ({ row }) => (
        <div className="font-mono text-text-secondary">{row.getValue("poId")}</div>
      )
    },
    {
      accessorKey: "supplierId",
      header: "Supplier",
    },
    {
      accessorKey: "warehouseId",
      header: "Receiving Warehouse",
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ row }) => {
        const dateStr = row.getValue("createdAt") as string;
        return <span>{new Date(dateStr).toLocaleDateString()}</span>;
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
            Goods Receipt Notes
          </h2>
          <p className="text-muted-foreground mt-2">
            Receive incoming stock from Purchase Orders and post to ledger.
          </p>
        </div>
        <Button onClick={() => router.push('/purchasing/grn/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create GRN
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
            data={grns || []} 
            searchKey="grnNumber"
            searchPlaceholder="Search by GRN Number..." 
          />
        )}
      </div>
    </>
  );
}
