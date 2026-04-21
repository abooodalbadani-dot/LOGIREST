"use client";

import { usePurchaseRequest } from "@/features/purchasing/api/usePurchaseRequests";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusTimeline, TimelineStep } from "@/components/ui/status-timeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PurchaseRequestLineItem } from "@/features/purchasing/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export function PRDetailsClient({ id }: { id: string }) {
  const { data: pr, isLoading } = usePurchaseRequest(id);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Purchase Request Not Found</h2>
        <Button className="mt-4" onClick={() => router.push('/purchasing/purchase-requests')}>
          Back to List
        </Button>
      </div>
    );
  }

  // Derive timeline steps from status
  const steps: TimelineStep[] = [
    { id: "draft", label: "Drafted", status: "completed", date: new Date(pr.createdAt).toLocaleDateString() },
    { 
      id: "pending", 
      label: "Pending Approval", 
      status: pr.status === 'PENDING_APPROVAL' ? "current" : "completed",
    },
    { 
      id: "approved", 
      label: "Approved", 
      status: pr.status === 'APPROVED' ? "current" : (pr.status === 'CONVERTED_TO_PO' ? "completed" : (pr.status === 'REJECTED' ? "error" : "pending"))
    },
    { 
      id: "po", 
      label: "Converted to PO", 
      status: pr.status === 'CONVERTED_TO_PO' ? "current" : "pending"
    }
  ];

  const columns: ColumnDef<PurchaseRequestLineItem>[] = [
    {
      accessorKey: "itemId",
      header: "Item SKU",
      cell: ({ row }) => <span className="font-mono">{row.getValue("itemId")}</span>
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "estimatedUnitCost",
      header: "Est. Unit Cost",
      cell: ({ row }) => {
        const val = parseFloat(row.getValue("estimatedUnitCost"));
        return <span className="font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(val)}</span>;
      }
    },
    {
      id: "total",
      header: "Line Total",
      cell: ({ row }) => {
        const qty = parseFloat(row.getValue("quantity"));
        const cost = parseFloat(row.getValue("estimatedUnitCost"));
        return <span className="font-mono font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(qty * cost)}</span>;
      }
    },
    {
      accessorKey: "notes",
      header: "Notes",
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/purchasing/purchase-requests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {pr.prNumber}
              </h2>
              <StatusBadge status={pr.status} />
            </div>
            <p className="text-muted-foreground mt-1">Requested by {pr.requestedBy} on {new Date(pr.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pr.status === 'PENDING_APPROVAL' && (
            <>
              <Button variant="outline" className="text-neon-error border-neon-error hover:bg-neon-error hover:text-black">Reject</Button>
              <Button className="bg-brand-secondary text-black hover:bg-brand-secondary/90">Approve</Button>
            </>
          )}
          {pr.status === 'APPROVED' && (
            <Button className="bg-brand-primary text-black hover:bg-brand-primary/90">
              <FileText className="mr-2 h-4 w-4" /> Convert to PO
            </Button>
          )}
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-surface-1 border border-border p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Request Status</h3>
        <StatusTimeline steps={steps} className="max-w-3xl mx-auto" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-1 border border-border p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Branch</h4>
          <p className="text-foreground font-medium">{pr.branchId === '1' ? 'Riyadh Main Branch' : 'Jeddah Branch'}</p>
        </div>
        <div className="bg-surface-1 border border-border p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Delivery</h4>
          <p className="text-foreground font-medium">{new Date(pr.expectedDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-surface-1 border border-brand-primary/30 p-5 rounded-xl shadow-[0_0_10px_rgba(58,190,255,0.1)]">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Total</h4>
          <p className="text-2xl font-mono font-bold text-brand-primary">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(pr.totalAmount)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {pr.notes && (
        <div className="bg-surface-2 border border-border p-5 rounded-xl text-sm">
          <span className="font-semibold block mb-1">Notes:</span>
          <span className="text-muted-foreground">{pr.notes}</span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-surface-1 border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-surface-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <span className="text-sm text-muted-foreground">{pr.items.length} items</span>
        </div>
        <div className="p-2">
          <DataTable 
            columns={columns} 
            data={pr.items} 
          />
        </div>
      </div>
    </div>
  );
}
