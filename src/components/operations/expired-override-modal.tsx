"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ShieldX } from "lucide-react";

// Simulated role check — in production this comes from AuthContext
type UserRole = "WH_MANAGER" | "WH_KEEPER" | "ADMIN";
const CURRENT_USER_ROLE: UserRole = "WH_MANAGER" as UserRole;
const CAN_OVERRIDE_EXPIRED = CURRENT_USER_ROLE !== "WH_KEEPER";

interface ExpiredOverrideModalProps {
 isOpen: boolean;
 onClose: () => void;
 lotNumber: string;
 itemId: string;
 expiryDate: string;
 onConfirm: (reason: string) => void;
}

export function ExpiredOverrideModal({
 isOpen,
 onClose,
 lotNumber,
 itemId,
 expiryDate,
 onConfirm,
}: ExpiredOverrideModalProps) {
 const [reason, setReason] = useState("");
 const reasonTrimmed = reason.trim();
 const isValid = reasonTrimmed.length >= 10;

 const handleConfirm = () => {
 if (!isValid) return;
 onConfirm(reasonTrimmed);
 setReason("");
 onClose();
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent className="sm:max-w-md">
 <DialogHeader>
 <div className="flex flex-col items-center text-center gap-3 mb-2">
 <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
 <AlertTriangle className="h-7 w-7 text-red-500" />
 </div>
 <DialogTitle className="text-title-lg text-red-500">منتج منتهي الصلاحية</DialogTitle>
 </div>
 </DialogHeader>

 <div className="space-y-4 py-2 text-body-md text-center">
 <p className="text-muted-foreground/80">
 تم مسح دُفعة منتهية الصلاحية:
 </p>
 <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-1 text-label-sm" dir="ltr">
 <p><span className="text-muted-foreground/60">Lot:</span> <span className="font-mono font-bold text-red-500">{lotNumber}</span></p>
 <p><span className="text-muted-foreground/60">Item:</span> <span className="font-medium">{itemId}</span></p>
 <p><span className="text-muted-foreground/60">Expired:</span> <span className="font-bold">{expiryDate}</span></p>
 </div>

 {!CAN_OVERRIDE_EXPIRED ? (
 <div className="flex flex-col items-center gap-3 py-4 text-muted-foreground/80">
 <ShieldX className="w-10 h-10 text-red-500 opacity-60" />
 <p className="font-medium text-red-500">لا تملك صلاحية تجاوز الصلاحية</p>
 <p className="text-label-sm text-muted-foreground/60">يُرجى التواصل مع مدير المستودع لإتمام هذه العملية.</p>
 </div>
 ) : (
 <div className="space-y-2 text-right">
 <Label htmlFor="override-reason" className="text-foreground font-medium">
 سبب التجاوز <span className="text-red-500">*</span>
 <span className="text-muted-foreground/60 font-normal text-label-sm ms-2">(10 أحرف على الأقل)</span>
 </Label>
 <Input
 id="override-reason"
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="الرجاء تذكر السبب التفصيلي لقبول هذا المنتج..."
 className={reason.length > 0 && !isValid ? "border-red-500" : ""} />
 {reason.length > 0 && !isValid && (
 <p className="text-label-sm text-red-500">
 {10 - reasonTrimmed.length} حرف إضافي مطلوب
 </p>
 )}
 </div>
 )}
 </div>

 <DialogFooter className="gap-2">
 <Button variant="outline" onClick={onClose}>
 {CAN_OVERRIDE_EXPIRED ? "إلغاء المسح" : "إغلاق"}
 </Button>
 {CAN_OVERRIDE_EXPIRED && (
 <Button
 className="bg-red-500 hover:bg-red-500/90 text-black font-bold"
 disabled={!isValid}
 onClick={handleConfirm}
 >
 تجاوز وإضافة
 </Button>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
