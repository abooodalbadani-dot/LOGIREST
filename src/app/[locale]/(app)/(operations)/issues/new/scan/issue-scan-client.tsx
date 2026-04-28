"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpiredOverrideModal } from "@/components/operations/expired-override-modal";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ScanLine, RotateCcw, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface ScannedLine {
  id: string;
  barcode: string;
  itemId: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  isExpired: boolean;
  overrideReason?: string;
}

// Mock barcode → product resolver
const BARCODE_DB: Record<string, { itemId: string; lotNumber: string; expiryDate: string; isExpired?: boolean }> = {
  "6281017075090": { itemId: "item-tomato", lotNumber: "LOT-T01", expiryDate: "2024-12-31" },
  "6287012349876": { itemId: "item-oil",    lotNumber: "LOT-O01", expiryDate: "2024-11-01", isExpired: true },
  "6281011234567": { itemId: "item-salt",   lotNumber: "LOT-S01", expiryDate: "2025-06-01" },
};

export function IssueScanClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [lines, setLines] = useState<ScannedLine[]>([]);
  const [lastFeedback, setLastFeedback] = useState<"success" | "error" | null>(null);

  // Expired override state
  const [expiredPending, setExpiredPending] = useState<{
    barcode: string; itemId: string; lotNumber: string; expiryDate: string;
  } | null>(null);

  const refocusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const flashFeedback = (type: "success" | "error") => {
    setLastFeedback(type);
    setTimeout(() => setLastFeedback(null), 1200);
  };

  const processBarcode = (barcode: string) => {
    const product = BARCODE_DB[barcode];
    if (!product) {
      flashFeedback("error");
      refocusInput();
      return;
    }

    const isExpired = product.isExpired || new Date(product.expiryDate) < new Date();

    if (isExpired) {
      // Open override modal; do NOT add to lines yet
      setExpiredPending({ barcode, itemId: product.itemId, lotNumber: product.lotNumber, expiryDate: product.expiryDate });
      return;
    }

    addLine({ barcode, ...product, isExpired: false });
    flashFeedback("success");
    refocusInput();
  };

  const addLine = (product: { barcode: string; itemId: string; lotNumber: string; expiryDate: string; isExpired: boolean }, overrideReason?: string) => {
    setLines((prev) => {
      const existing = prev.findIndex((l) => l.lotNumber === product.lotNumber);
      if (existing !== -1) {
        // Increment quantity for existing lot
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
        return updated;
      }
      return [
        ...prev,
        {
          id: `scan-${Date.now()}`,
          barcode: product.barcode,
          itemId: product.itemId,
          lotNumber: product.lotNumber,
          expiryDate: product.expiryDate,
          quantity: 1,
          isExpired: product.isExpired,
          overrideReason,
        },
      ];
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      processBarcode(barcodeInput.trim());
      setBarcodeInput("");
    }
  };

  const handleUndoLast = () => {
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.quantity > 1) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, quantity: last.quantity - 1 };
        return updated;
      }
      return prev.slice(0, -1);
    });
    refocusInput();
  };

  const borderClass =
    lastFeedback === "success"
      ? "border-brand-primary shadow-[0_0_15px_rgba(58,190,255,0.4)]"
      : lastFeedback === "error"
      ? "border-red-500 shadow-[0_0_15px_rgba(255,180,171,0.4)]"
      : "border-surface-2";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 rtl:hidden" />
          <ArrowRight className="h-5 w-5 hidden rtl:block" />
        </Button>
        <Breadcrumb items={[
          { label: "العمليات", href: "/operations" },
          { label: "صرف المخزون", href: "/operations/issues" },
          { label: "وضع المسح", href: "#" },
        ]} />
      </div>

      <div className="flex items-center gap-3">
        <ScanLine className="w-8 h-8 text-brand-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">وضع المسح الضوئي</h2>
          <p className="text-muted-foreground text-sm">امسح الباركود لإضافة المنتجات بسرعة.</p>
        </div>
      </div>

      {/* Scan Input */}
      <div className={`relative border-2 rounded-xl p-5 transition-all duration-200 ${borderClass}`}>
        <label className="text-sm font-medium text-text-secondary mb-2 block">مسح الباركود</label>
        <Input
          ref={inputRef}
          autoFocus
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="وجِّه الماسح هنا أو اكتب الباركود واضغط Enter..."
          className="text-lg font-mono h-14 bg-surface-2 border-0 focus-visible:ring-1"
          dir="ltr"
        />
        {lastFeedback === "success" && (
          <div className="absolute start-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-brand-primary text-sm font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" /> تمت الإضافة
          </div>
        )}
        {lastFeedback === "error" && (
          <div className="absolute start-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500 text-sm font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4" /> باركود غير معروف
          </div>
        )}
      </div>

      {/* Line list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">الأصناف الممسوحة ({lines.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleUndoLast} disabled={lines.length === 0}>
              <RotateCcw className="me-1 w-4 h-4" />
              تراجع
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <ScanLine className="w-10 h-10 mx-auto opacity-20 mb-2" />
              لم يُمسح أي صنف بعد.
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                    line.isExpired ? "bg-red-500/5 border-red-500/30" : "bg-surface-2/40 border-surface-2"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{line.itemId}</span>
                      {line.isExpired && (
                        <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> منتهي — تجاوز مسموح
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary font-mono" dir="ltr">
                      {line.lotNumber} | Exp: {line.expiryDate}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-brand-primary" dir="ltr">×{line.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired Override Modal */}
      {expiredPending && (
        <ExpiredOverrideModal
          isOpen={!!expiredPending}
          onClose={() => { setExpiredPending(null); refocusInput(); }}
          lotNumber={expiredPending.lotNumber}
          itemId={expiredPending.itemId}
          expiryDate={expiredPending.expiryDate}
          onConfirm={(reason) => {
            addLine({ ...expiredPending, isExpired: true }, reason);
            flashFeedback("success");
            setExpiredPending(null);
            refocusInput();
          }}
        />
      )}
    </div>
  );
}
