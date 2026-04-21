"use client";

import { useTranslations } from "next-intl";
import { usePurchaseRequests } from "@/features/purchasing/api/usePurchaseRequests";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PurchaseRequest } from "@/features/purchasing/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function PurchaseRequestsClient() {
  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }
  
  const { data: requests, isLoading } = usePurchaseRequests();
  const router = useRouter();

  const columns: ColumnDef<PurchaseRequest>[] = [
    {
      accessorKey: "prNumber",
      header: "PR Number",
      cell: ({ row }) => (
        <Link href={`/purchasing/purchase-requests/${row.original.id}`} className="font-mono text-brand-primary font-medium hover:underline">
          {row.getValue("prNumber")}
        </Link>
      )
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
      accessorKey: "requestedBy",
      header: "Requested By",
    },
    {
      accessorKey: "totalAmount",
      header: "Est. Total",
      cell: ({ row }) => {
        const cost = parseFloat(row.getValue("totalAmount"));
        return <span className="font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cost)}</span>;
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
            Purchase Requests
          </h2>
          <p className="text-muted-foreground mt-2">
            Create and track internal procurement requests before vendor PO creation.
          </p>
        </div>
        <Button onClick={() => router.push('/purchasing/purchase-requests/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Create PR
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
            data={requests || []} 
            searchKey="prNumber"
            searchPlaceholder="Search by PR Number..." 
          />
        )}
      </div>
    </>
  );
}
