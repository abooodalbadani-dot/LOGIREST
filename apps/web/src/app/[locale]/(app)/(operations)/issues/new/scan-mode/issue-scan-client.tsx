"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpiredOverrideModal } from "@/components/operations/expired-override-modal";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ScanLine, RotateCcw, AlertTriangle, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { apiClient } from "@/lib/api/client";
import { z } from "zod";

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

const generateMockLot = () => `LOT-${Date.now().toString().slice(-4)}`;
const generateMockExpiry = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// Removed BARCODE_DB mock

export function IssueScanClient() {
 const t = useTranslations("operations.issue.scan_mode");
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

 const processBarcode = async (barcode: string) => {
  try {
   // Assuming endpoint /items/by-barcode or similar. Using a generic schema for now.
   const response = await apiClient.get(
    `/items?search=${encodeURIComponent(barcode)}`,
    z.any()
   );
   
   const items = response?.data || response;
   const product = Array.isArray(items) ? items.find(i => i.code === barcode || i.barcode === barcode) : items;

   if (!product) {
    flashFeedback("error");
    refocusInput();
    return;
   }

   // Fallback mock logic for lot/expiry if API doesn't provide it yet, 
   // but using the real item ID from the backend.
   const lotNumber = product.lotNumber || generateMockLot();
   const expiryDate = product.expiryDate || generateMockExpiry();
   const isExpired = product.isExpired || new Date(expiryDate) < new Date();
   const isQuarantined = product.status === 'QUARANTINE' || product.lotStatus === 'QUARANTINE';

   if (isQuarantined) {
    flashFeedback("error");
    // Show toast or let flash feedback handle the visual error
    refocusInput();
    return;
   }

   if (isExpired) {
    // Open override modal; do NOT add to lines yet
    setExpiredPending({ barcode, itemId: product.id || product.code || 'unknown', lotNumber, expiryDate });
    return;
   }

   addLine({ barcode, itemId: product.id || product.code || 'unknown', lotNumber, expiryDate, isExpired: false });
   flashFeedback("success");
   refocusInput();
  } catch (err) {
   flashFeedback("error");
   refocusInput();
  }
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
 id: `scan- ${Date.now()}`,
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
 { label: t("breadcrumb_operations"), href: "#" },
 { label: t("breadcrumb_issues"), href: "/issues" },
 { label: t("breadcrumb_scan"), href: "#" },
 ]} />
 </div>

 <div className="flex items-center gap-3">
 <ScanLine className="w-8 h-8 text-brand-primary" />
 <div>
 <h2 className="text-headline-lg font-bold text-foreground">{t("title")}</h2>
 <p className="text-muted-foreground text-body-md">{t("subtitle")}</p>
 </div>
 </div>

 {/* Scan Input */}
 <div className={`relative border-2 rounded-xl p-5 transition-all duration-200 ${borderClass}`}>
 <label className="text-body-md font-medium text-text-secondary mb-2 block">{t("input_label")}</label>
 <Input
 ref={inputRef}
 autoFocus
 value={barcodeInput}
 onChange={(e) => setBarcodeInput(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder={t("input_placeholder")}
 className="text-title-sm font-mono h-14 bg-surface-2 border-0 focus-visible:ring-1"
 dir="ltr"
 />
 {lastFeedback === "success" && (
 <div className="absolute start-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-brand-primary text-body-md font-bold animate-pulse">
 <CheckCircle2 className="w-4 h-4" /> {t("added_feedback")}
 </div>
 )}
 {lastFeedback === "error" && (
 <div className="absolute start-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500 text-body-md font-bold animate-pulse">
 <AlertTriangle className="w-4 h-4" /> {t("unknown_feedback")}
 </div>
 )}
 </div>

 {/* Line list */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle className="text-title-sm">{t("scanned_items_count", { count: lines.length })}</CardTitle>
 <Button variant="ghost" size="sm" onClick={handleUndoLast} disabled={lines.length === 0}>
 <RotateCcw className="me-1 w-4 h-4" />
 {t("undo")}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {lines.length === 0 ? (
 <div className="py-10 text-center text-muted-foreground text-body-md">
 <ScanLine className="w-10 h-10 mx-auto opacity-20 mb-2" />
 {t("empty_state")}
 </div>
 ) : (
 <div className="space-y-2">
 {lines.map((line) => (
 <div
 key={line.id}
 className={`flex items-center justify-between p-3 rounded-lg border text-body-md ${ line.isExpired ? "bg-red-500/5 border-red-500/30" : "bg-surface-2/40 border-surface-2" }`}
 >
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <span className="font-medium text-text-primary">{line.itemId}</span>
 {line.isExpired && (
 <span className="text-label-sm text-red-500 font-bold flex items-center gap-1">
 <AlertTriangle className="w-3 h-3" /> {t("expired_warning")}
 </span>
 )}
 </div>
 <p className="text-label-sm text-text-tertiary font-mono" dir="ltr">
 {line.lotNumber} | {t("expiry_label", { date: line.expiryDate })}
 </p>
 </div>
 <span className="text-title-lg font-bold text-brand-primary" dir="ltr">×{line.quantity}</span>
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
