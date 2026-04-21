"use client";

import { useIssues } from "@/features/operations/api/useIssues";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Issue } from "@/features/operations/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, ScanLine } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function IssuesClient() {
  const { data: issues, isLoading } = useIssues();
  const router = useRouter();

  const columns: ColumnDef<Issue>[] = [
    {
      accessorKey: "issueNumber",
      header: "رقم الصرف",
      cell: ({ row }) => (
        <Link href={`/operations/issues/${row.original.id}`} className="font-mono text-brand-primary font-medium hover:underline">
          {row.getValue("issueNumber")}
        </Link>
      ),
    },
    {
      accessorKey: "warehouseId",
      header: "المخزن",
      cell: ({ row }) => <span className="text-text-secondary">{row.getValue("warehouseId")}</span>,
    },
    {
      accessorKey: "departmentId",
      header: "القسم",
    },
    {
      accessorKey: "createdAt",
      header: "التاريخ",
      cell: ({ row }) => (
        <span dir="ltr">{new Date(row.getValue("createdAt")).toLocaleDateString()}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "الحالة",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            صرف المخزون
          </h2>
          <p className="text-muted-foreground mt-2">
            إدارة عمليات صرف المواد من المستودع إلى الأقسام.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/operations/issues/new/scan")}>
            <ScanLine className="mr-2 h-4 w-4" />
            وضع المسح
          </Button>
          <Button onClick={() => router.push("/operations/issues/new")}>
            <Plus className="mr-2 h-4 w-4" />
            صرف جديد
          </Button>
        </div>
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
            data={issues || []}
            searchKey="issueNumber"
            searchPlaceholder="البحث برقم الصرف..."
          />
        )}
      </div>
    </>
  );
}
