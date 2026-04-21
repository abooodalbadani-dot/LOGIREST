"use client";

import { usePurchaseOrder } from "@/features/purchasing/api/usePurchaseOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusTimeline, TimelineStep } from "@/components/ui/status-timeline";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { PurchaseOrderLineItem } from "@/features/purchasing/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DocumentReadOnlyOverlay } from "@/components/ui/document-readonly-overlay";

export function PODetailsClient({ id }: { id: string }) {
  const { data: po, isLoading } = usePurchaseOrder(id);
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

  if (!po) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Purchase Order Not Found</h2>
        <Button className="mt-4" onClick={() => router.push('/purchasing/po')}>
          Back to List
        </Button>
      </div>
    );
  }

  // Derive timeline steps from status
  const steps: TimelineStep[] = [
    { id: "draft", label: "Drafted", status: "completed", date: new Date(po.createdAt).toLocaleDateString() },
    { 
      id: "pending", 
      label: "Pending Approval", 
      status: po.status === 'PENDING_APPROVAL' ? "current" : "completed",
    },
    { 
      id: "approved", 
      label: "Approved", 
      status: po.status === 'APPROVED' ? "current" : (['PARTIAL_RECEIPT', 'FULFILLED', 'CANCELLED'].includes(po.status) ? "completed" : (po.status === 'REJECTED' ? "error" : "pending"))
    },
    { 
      id: "receipt", 
      label: "Receipt (GRN)", 
      status: po.status === 'PARTIAL_RECEIPT' ? "current" : (po.status === 'FULFILLED' ? "completed" : "pending")
    }
  ];

  const columns: ColumnDef<PurchaseOrderLineItem>[] = [
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
      accessorKey: "unitPrice",
      header: `Unit Price (${po.supplierCurrency})`,
      cell: ({ row }) => {
        const val = parseFloat(row.getValue("unitPrice"));
        return <span className="font-mono" dir="ltr">{new Intl.NumberFormat('en-US', { style: 'currency', currency: po.supplierCurrency }).format(val)}</span>;
      }
    },
    {
      id: "total",
      header: `Line Total (${po.supplierCurrency})`,
      cell: ({ row }) => {
        const qty = parseFloat(row.getValue("quantity"));
        const cost = parseFloat(row.getValue("unitPrice"));
        return <span className="font-mono font-medium" dir="ltr">{new Intl.NumberFormat('en-US', { style: 'currency', currency: po.supplierCurrency }).format(qty * cost)}</span>;
      }
    },
    {
      accessorKey: "notes",
      header: "Notes",
    }
  ];

  const isReadOnly = ['APPROVED', 'PARTIAL_RECEIPT', 'FULFILLED', 'CANCELLED'].includes(po.status);

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative">
      <DocumentReadOnlyOverlay isLocked={isReadOnly}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/purchasing/po')} className="relative z-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {po.poNumber}
              </h2>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-muted-foreground mt-1">Created by {po.createdBy} on {new Date(po.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {po.status === 'PENDING_APPROVAL' && (
            <>
              <Button variant="outline" className="text-neon-error border-neon-error hover:bg-neon-error hover:text-black">Reject</Button>
              <Button className="bg-brand-secondary text-black hover:bg-brand-secondary/90">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {po.status === 'APPROVED' && (
            <Button className="bg-accent text-white hover:bg-accent/90" onClick={() => router.push(`/purchasing/grn/new?poId=${po.id}`)}>
              <Download className="mr-2 h-4 w-4" /> Receive Goods (GRN)
            </Button>
          )}
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print PO
          </Button>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-surface-1 border border-border p-6 rounded-xl shadow-sm relative z-10">
        <h3 className="text-lg font-semibold mb-6">PO Status</h3>
        <StatusTimeline steps={steps} className="max-w-3xl mx-auto" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <div className="bg-surface-1 border border-border p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Supplier</h4>
          <p className="text-foreground font-medium">{po.supplierId}</p>
        </div>
        <div className="bg-surface-1 border border-border p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Expected Delivery</h4>
          <p className="text-foreground font-medium">{new Date(po.expectedDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-surface-1 border border-border p-5 rounded-xl shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">FX Rate & Currency</h4>
          <p className="text-foreground font-medium font-mono">1 {po.supplierCurrency} = {po.exchangeRate} SAR</p>
        </div>
        <div className="bg-surface-1 border border-brand-primary/30 p-5 rounded-xl shadow-[0_0_10px_rgba(58,190,255,0.1)]">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Base Total</h4>
          <p className="text-2xl font-mono font-bold text-brand-primary" dir="ltr">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(po.baseTotalAmount)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="bg-surface-2 border border-border p-5 rounded-xl text-sm relative z-10">
          <span className="font-semibold block mb-1">Notes:</span>
          <span className="text-muted-foreground">{po.notes}</span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-surface-1 border border-border rounded-xl shadow-sm overflow-hidden relative z-10">
        <div className="p-5 border-b border-border bg-surface-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Line Items</h3>
          <div className="text-sm text-foreground">
            Supplier Total: <span className="font-mono font-bold" dir="ltr">{new Intl.NumberFormat('en-US', { style: 'currency', currency: po.supplierCurrency }).format(po.supplierTotalAmount)}</span>
          </div>
        </div>
        <div className="p-2">
          <DataTable 
            columns={columns} 
            data={po.items} 
          />
        </div>
      </div>
      </DocumentReadOnlyOverlay>
    </div>
  );
}
