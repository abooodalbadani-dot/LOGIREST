"use client";

import { useGoodsReceipt } from "@/features/purchasing/api/useGoodsReceipts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusTimeline, TimelineStep } from "@/components/ui/status-timeline";
import { DocumentReadOnlyOverlay } from "@/components/ui/document-readonly-overlay";
import { FXCapturePanel } from "@/components/ui/fx-capture-panel";
import { ArrowLeft, ArrowRight, Printer, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export function GRNDetailsClient({ id }: { id: string }) {
  const { data: grn, isLoading } = useGoodsReceipt(id);
  const router = useRouter();

  let t: any;
  try {
    t = useTranslations("common");
  } catch(e) {
    t = (k: string) => k;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!grn) {
    return <div>GRN not found</div>;
  }

  const isPosted = grn.status === 'POSTED';
  const isCancelled = grn.status === 'CANCELLED';
  const isReadOnly = isPosted || isCancelled;

  const timelineSteps: TimelineStep[] = [
    {
      id: "draft",
      label: "Draft",
      status: grn.status === "DRAFT" ? "current" : "completed",
    },
    {
      id: "received",
      label: "Received",
      status: grn.status === "DRAFT" ? "pending" : grn.status === "RECEIVED" ? "current" : "completed",
    },
    {
      id: "posted",
      label: "Posted to Ledger",
      status: grn.status === "POSTED" ? "completed" : "pending",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5 rtl:hidden" />
            <ArrowRight className="h-5 w-5 hidden rtl:block" />
          </Button>
          <Breadcrumb 
            items={[
              { label: "Purchasing", href: "/purchasing" },
              { label: "Goods Receipts", href: "/purchasing/grn" },
              { label: grn.grnNumber, href: "#" },
            ]} 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          {grn.status === 'RECEIVED' && (
            <Button 
              className="bg-brand-primary hover:bg-brand-primary/90 text-white"
              onClick={() => router.push(`/purchasing/grn/${grn.id}/post`)}
            >
              <Database className="mr-2 h-4 w-4" />
              Post to Ledger
            </Button>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {grn.grnNumber}
        </h2>
        <p className="text-muted-foreground mt-2">
          Created on {new Date(grn.createdAt).toLocaleDateString()} by {grn.createdBy}
        </p>
      </div>

      <div className="bg-surface-1 border border-surface-2 p-6 rounded-lg shadow-sm">
        <StatusTimeline steps={timelineSteps} />
      </div>

      {isPosted && grn.lockedExchangeRate && grn.baseTotalAmount && (
        <FXCapturePanel 
          readOnly 
          supplierCurrency={grn.supplierCurrency}
          initialRate={grn.lockedExchangeRate}
          supplierTotal={grn.baseTotalAmount / grn.lockedExchangeRate} 
        />
      )}

      <DocumentReadOnlyOverlay isLocked={isReadOnly} lockedMessage="This GRN has been posted to the ledger and cannot be modified.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-tertiary">PO Reference</p>
                <p className="font-medium text-text-primary">{grn.poId}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Warehouse</p>
                <p className="font-medium text-text-primary">{grn.warehouseId}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Supplier</p>
                <p className="font-medium text-text-primary">{grn.supplierId}</p>
              </div>
              {isPosted && grn.postedAt && (
                <div>
                  <p className="text-text-tertiary">Posted At</p>
                  <p className="font-medium text-text-primary">{new Date(grn.postedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
            {grn.notes && (
              <div className="pt-2 border-t border-surface-2 mt-2">
                <p className="text-text-tertiary text-sm">Notes</p>
                <p className="text-text-primary mt-1">{grn.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Received Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-surface-2 rounded-md overflow-hidden">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item ID</th>
                    <th className="px-4 py-3 font-medium text-center">Ordered Qty</th>
                    <th className="px-4 py-3 font-medium text-center">Received Qty</th>
                    <th className="px-4 py-3 font-medium">Lot Number</th>
                    <th className="px-4 py-3 font-medium">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-2">
                  {grn.items.map((item) => (
                    <tr key={item.id} className="bg-surface-1 hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{item.itemId}</td>
                      <td className="px-4 py-3 text-center">{item.orderedQuantity}</td>
                      <td className="px-4 py-3 text-center font-bold text-brand-primary">{item.receivedQuantity}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-surface-2 rounded text-xs">{item.lotNumber}</span></td>
                      <td className="px-4 py-3">{item.expiryDate}</td>
                    </tr>
                  ))}
                  {grn.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">No items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      </DocumentReadOnlyOverlay>
    </div>
  );
}
