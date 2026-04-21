"use client";

import { useStocktakes } from "@/features/operations/api/useStocktakes";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Stocktake } from "@/features/operations/types/stocktake";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_LOCKED = new Set(["STARTED", "COUNTING", "VARIANCE"]);

export function StocktakesClient() {
  const { data: stocktakes, isLoading } = useStocktakes();
  const router = useRouter();

  const columns: ColumnDef<Stocktake>[] = [
    {
      accessorKey: "sessionName",
      header: "اسم الجلسة",
      cell: ({ row }) => (
        <Link
          href={`/operations/stocktakes/${row.original.id}`}
          className="font-medium text-brand-primary hover:underline flex items-center gap-2"
        >
          {STATUS_LOCKED.has(row.original.status) && (
            <LockKeyhole className="w-3.5 h-3.5 shrink-0 text-neon-amber" />
          )}
          {row.getValue("sessionName")}
        </Link>
      ),
    },
    {
      accessorKey: "warehouseId",
      header: "المخزن",
      cell: ({ row }) => <span className="text-text-secondary">{row.getValue("warehouseId")}</span>,
    },
    {
      accessorKey: "status",
      header: "الحالة",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      accessorKey: "createdAt",
      header: "تاريخ الإنشاء",
      cell: ({ row }) => (
        <span dir="ltr">{new Date(row.getValue("createdAt")).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "postedBy",
      header: "المرحِّل",
      cell: ({ row }) => (
        <span className="text-text-secondary text-sm">{row.getValue("postedBy") ?? "—"}</span>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">جلسات الجرد</h2>
          <p className="text-muted-foreground mt-2">
            إنشاء وإدارة جلسات الجرد الدوري وتتبع حالة كل مستودع.
          </p>
        </div>
        <Button onClick={() => router.push("/operations/stocktakes/new")}>
          <Plus className="mr-2 h-4 w-4" />
          جلسة جرد جديدة
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
            data={stocktakes || []}
            searchKey="sessionName"
            searchPlaceholder="البحث باسم الجلسة..."
          />
        )}
      </div>
    </>
  );
}
