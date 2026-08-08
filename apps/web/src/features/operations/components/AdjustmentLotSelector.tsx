"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { z } from "zod";
import { SmartCombobox } from "@/components/shared/SmartCombobox";
import { format, parseISO, isValid } from "date-fns";
import { Plus, Tag, X, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const LotSchema = z.object({
  id: z.string(),
  lotNumber: z.string().optional(),
  lot_number: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  qtyAvailable: z.number().optional(),
  qty_available: z.number().optional(),
  totalQty: z.number().optional(),
  total_qty: z.number().optional(),
});

const LotsResponseSchema = z.object({
  data: z.array(LotSchema),
});

export function useLotsByItem({
  itemId,
  warehouseId,
}: {
  itemId: string;
  warehouseId: string;
}) {
  return useQuery({
    queryKey: ["lots-available", warehouseId, itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const params: Record<string, string> = { itemId };
      if (warehouseId) params.warehouseId = warehouseId;
      const qs = new URLSearchParams(params);
      const res = await apiClient.get(
        `/operations/lots-available?${qs.toString()}`,
        LotsResponseSchema,
      );
      return (res.data || []).map((l) => ({
        id: l.id,
        lotNumber: l.lotNumber || l.lot_number || l.id,
        expiryDate: l.expiryDate || l.expiry_date || null,
        qtyAvailable:
          l.qtyAvailable ?? l.qty_available ?? l.totalQty ?? l.total_qty ?? 0,
      }));
    },
    enabled: Boolean(itemId),
  });
}

function CreateLotModal({
  isOpen,
  onClose,
  onSave,
  locale = "ar",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lotNumber: string, expiryDate?: string | null) => void;
  locale?: "ar" | "en";
}) {
  const [lotNumber, setLotNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const isRtl = locale === "ar";

  const selectedDate = expiryDate ? parseISO(expiryDate) : null;
  const isDateValid = Boolean(selectedDate && isValid(selectedDate));

  const handleSave = () => {
    if (!lotNumber.trim()) return;
    onSave(lotNumber.trim(), expiryDate.trim() ? expiryDate.trim() : null);
    setLotNumber("");
    setExpiryDate("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-card backdrop-blur-2xl border border-border shadow-2xl text-foreground rounded-3xl p-6 sm:max-w-[425px]"
        style={{ width: "90vw", maxWidth: "425px" }}
      >
        <DialogHeader className="space-y-1 text-start">
          <DialogTitle className="text-sm font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-gold" />
            {isRtl ? "إنشاء دفعة جديدة" : "CREATE NEW LOT"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {isRtl ? "رقم الدفعة *" : "LOT NUMBER *"}
            </Label>
            <Input
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="LOT-1234"
              className="bg-surface-container-highest/40 border border-border/70 text-foreground font-mono text-sm h-11 rounded-xl focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {isRtl ? "تاريخ الانتهاء" : "EXPIRY DATE"}
              </Label>
              {expiryDate && (
                <button
                  type="button"
                  onClick={() => setExpiryDate("")}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  {isRtl ? "مسح" : "Clear"}
                </button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-11 w-full rounded-xl border border-border/70 bg-surface-container-highest/40 px-3 font-mono text-sm shadow-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold items-center justify-between font-semibold text-foreground transition-colors cursor-pointer",
                    !expiryDate && "text-muted-foreground"
                  )}
                >
                  <span
                    lang="en"
                    dir="ltr"
                    className="force-latin-numbers inline-block text-start font-mono text-sm"
                  >
                    {isDateValid && selectedDate
                      ? format(selectedDate, "yyyy-MM-dd")
                      : (isRtl ? "YYYY-MM-DD (اختياري)" : "YYYY-MM-DD (Optional)")}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-muted-foreground/60 shrink-0 ms-2" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 border border-border bg-card shadow-2xl rounded-2xl z-[100]"
                align="start"
              >
                <CalendarComponent
                  mode="single"
                  selected={isDateValid && selectedDate ? selectedDate : undefined}
                  onSelect={(date) => {
                    setExpiryDate(date ? format(date, "yyyy-MM-dd") : "");
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="border-t border-border/40 pt-4 flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!lotNumber.trim()}
            className="w-full h-11 bg-gradient-to-r from-brand-gold via-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isRtl ? "حفظ" : "SAVE"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            {isRtl ? "إلغاء" : "CANCEL"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface AdjustmentLotSelectorProps {
  itemId: string;
  warehouseId: string;
  value?: string;
  lotNumber?: string;
  direction?: "INCREASE" | "DECREASE";
  disabled?: boolean;
  locale?: "ar" | "en";
  onChange: (lotId: string, lotNumber: string, expiryDate?: string | null) => void;
  triggerClassName?: string;
}

export function AdjustmentLotSelector({
  itemId,
  warehouseId,
  value,
  lotNumber: initialLotNumber,
  direction = "INCREASE",
  disabled = false,
  locale = "ar",
  onChange,
  triggerClassName,
}: AdjustmentLotSelectorProps) {
  const { data: lots, isLoading } = useLotsByItem({ itemId, warehouseId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdLotNumber, setCreatedLotNumber] = useState(initialLotNumber || "");

  const comboboxItems = useMemo(() => {
    const list = (lots || []).map((lot) => {
      const qtyStr = lot.qtyAvailable ? ` (${lot.qtyAvailable})` : "";
      return {
        id: lot.id,
        name: `${lot.lotNumber}${qtyStr}`,
        code: lot.lotNumber,
      };
    });

    if (value && initialLotNumber && !list.some((i) => i.id === value)) {
      list.unshift({
        id: value,
        name: initialLotNumber,
        code: initialLotNumber,
      });
    }

    return list;
  }, [lots, value, initialLotNumber]);

  useEffect(() => {
    if (initialLotNumber && (!value || value.startsWith("new-"))) {
      setCreatedLotNumber(initialLotNumber);
    }
  }, [initialLotNumber, value]);

  const isRtl = locale === "ar";
  const isCreatedLot = Boolean(createdLotNumber && value?.startsWith("new-"));
  const canCreateNew = direction === "INCREASE";

  const handleCreateSave = (newLotNum: string, expiryDate?: string | null) => {
    setCreatedLotNumber(newLotNum);
    onChange(`new-${newLotNum}`, newLotNum, expiryDate || null);
  };

  const handleClearCreated = () => {
    setCreatedLotNumber("");
    onChange("", "", null);
  };

  return (
    <div className="flex items-center gap-2 w-full min-w-0 dir-auto">
      {isCreatedLot ? (
        <div className="flex items-center justify-between gap-2 h-9 px-3 bg-brand-gold/15 border border-brand-gold/40 rounded-xl w-full text-brand-gold font-mono text-xs font-bold shadow-sm min-w-0">
          <div className="flex items-center gap-1.5 truncate min-w-0">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{createdLotNumber}</span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClearCreated}
              className="text-brand-gold/70 hover:text-brand-gold p-0.5 rounded-md hover:bg-brand-gold/20 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <SmartCombobox
            items={comboboxItems}
            value={value || ""}
            disabled={disabled || isLoading}
            onSelect={(item) => {
              const selected = lots?.find((l) => l.id === item.id);
              if (selected) {
                setCreatedLotNumber("");
                onChange(
                  selected.id,
                  selected.lotNumber,
                  selected.expiryDate ? String(selected.expiryDate) : null,
                );
              }
            }}
            placeholder={
              isLoading
                ? isRtl
                  ? "جاري التحميل..."
                  : "Loading..."
                : isRtl
                  ? "اختر رقم الدفعة"
                  : "Select Lot #"
            }
            triggerClassName={
              triggerClassName ||
              "w-full h-9 rounded-xl border border-border/70 bg-surface-container-highest/30 backdrop-blur-md text-start px-3 font-mono text-xs outline-none transition-all text-foreground focus:ring-1 focus:ring-brand-gold shadow-sm flex items-center justify-between min-w-[130px] md:min-w-[150px] truncate"
            }
          />
        </div>
      )}

      {!isCreatedLot && canCreateNew && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsModalOpen(true)}
          title={isRtl ? "إنشاء دفعة جديدة" : "Create new lot"}
          className="h-9 px-3 bg-brand-gold/15 hover:bg-brand-gold/25 dark:bg-brand-gold/20 dark:hover:bg-brand-gold/30 text-amber-900 dark:text-brand-gold border border-brand-gold/40 hover:border-brand-gold/60 font-bold text-xs rounded-xl transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isRtl ? "جديد" : "New"}</span>
        </button>
      )}

      <CreateLotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateSave}
        locale={locale}
      />
    </div>
  );
}
