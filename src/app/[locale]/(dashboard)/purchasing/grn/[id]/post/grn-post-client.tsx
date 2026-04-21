"use client";

import { useGoodsReceipt, usePostGoodsReceipt } from "@/features/purchasing/api/useGoodsReceipts";
import { usePurchaseOrder } from "@/features/purchasing/api/usePurchaseOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FXCapturePanel } from "@/components/ui/fx-capture-panel";
import { PostConfirmDialog } from "@/components/ui/post-confirm-dialog";
import { ArrowLeft, ArrowRight, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export function GRNPostClient({ id }: { id: string }) {
  const router = useRouter();
  const { data: grn, isLoading: isLoadingGRN } = useGoodsReceipt(id);
  const { data: po, isLoading: isLoadingPO } = usePurchaseOrder(grn?.poId || "");
  const postGRN = usePostGoodsReceipt();

  const [currentRate, setCurrentRate] = useState<number>(0);
  const [currentBaseTotal, setCurrentBaseTotal] = useState<number>(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const calculatedSupplierTotal = useMemo(() => {
    if (!grn || !po) return 0;
    
    // In a real app, unit prices are fetched specifically.
    // Here we'll map PO line prices to GRN received quantities
    let total = 0;
    grn.items.forEach(grnItem => {
      const poLine = po.items.find(pi => pi.itemId === grnItem.itemId);
      if (poLine) {
        total += (poLine.unitPrice * grnItem.receivedQuantity);
      }
    });
    return total;
  }, [grn, po]);

  // Initial rate fallback
  const initialRate = po?.exchangeRate || 1;

  if (isLoadingGRN || isLoadingPO) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!grn) {
    return <div>GRN not found</div>;
  }

  if (grn.status === 'POSTED') {
    return <div>This Goods Receipt is already posted.</div>;
  }

  const handlePostConfirmed = () => {
    if (currentRate <= 0) {
      console.error("Please provide a valid exchange rate before posting");
      return;
    }

    postGRN.mutate(
      { id: grn.id, lockedExchangeRate: currentRate, baseTotalAmount: currentBaseTotal },
      {
        onSuccess: () => {
          router.push(`/purchasing/grn/${grn.id}`);
        },
        onError: () => {
          console.error("Failed to post Goods Receipt");
        }
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
               { label: grn.grnNumber, href: `/purchasing/grn/${grn.id}` },
               { label: "Post to Ledger", href: "#" },
            ]} 
          />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Database className="w-8 h-8 text-brand-primary" />
          Post to Ledger
        </h2>
        <p className="text-muted-foreground mt-2">
          Finalize the exchange rate and post the receipt to the inventory and financial ledgers.
        </p>
      </div>

      <FXCapturePanel
        supplierCurrency={grn.supplierCurrency || po?.supplierCurrency || 'USD'}
        supplierTotal={calculatedSupplierTotal}
        initialRate={initialRate}
        onRateChange={(rate, baseTotal) => {
          setCurrentRate(rate);
          setCurrentBaseTotal(baseTotal);
        }}
        readOnly={false}
      />

      <div className="flex justify-end gap-4 mt-8">
        <Button variant="outline" onClick={() => router.back()} disabled={postGRN.isPending}>
          Cancel
        </Button>
        <Button 
          className="bg-brand-primary hover:bg-brand-primary/90 text-white"
          onClick={() => setIsConfirmOpen(true)}
          disabled={postGRN.isPending || currentRate <= 0}
        >
          {postGRN.isPending ? "Posting..." : "Confirm & Post"}
        </Button>
      </div>

      <PostConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => {
          setIsConfirmOpen(false);
          handlePostConfirmed();
        }}
        title="Post Goods Receipt?"
        description="This action is irreversible. The exchange rate will be locked, stock levels will be updated, and the record will become read-only."
        confirmText="Post to Ledger"
      />
    </div>
  );
}
