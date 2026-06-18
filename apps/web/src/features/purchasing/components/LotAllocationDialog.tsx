'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PackageCheck, Calendar, Hash, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Schema ──────────────────────────────────────────────────────────────────

export const LotAllocationSchema = z.object({
  id: z.string(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable(),
});

export type LotAllocation = z.infer<typeof LotAllocationSchema>;

const generateTempId = () => `new-${Date.now()}`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface LotAllocationDialogProps {
  open: boolean;
  onClose: () => void;
  itemName: string;
  receivedQty: number;
  currentLot: LotAllocation | null;
  onConfirm: (lot: LotAllocation) => void;
  onClear: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LotAllocationDialog({
  open,
  onClose,
  itemName,
  receivedQty,
  currentLot,
  onConfirm,
  onClear,
}: LotAllocationDialogProps) {
  const t = useTranslations('procurement.grn');
  const tc = useTranslations('common');

  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date().toISOString().split('T')[0]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setLotNumber(currentLot?.lotNumber ?? '');
      setExpiryDate(currentLot?.expiryDate ?? new Date().toISOString().split('T')[0]);
      setTouched(false);
    }
  }, [open, currentLot]);

  const lotNumberTrimmed = lotNumber.trim();
  const isLotNumberValid = lotNumberTrimmed.length > 0;
  const isFormValid = isLotNumberValid;

  const isExpiryInPast = expiryDate
    ? new Date(expiryDate) < new Date(new Date().toDateString())
    : false;

  const handleConfirm = () => {
    setTouched(true);
    if (!isFormValid) return;
    onConfirm({
      id: currentLot?.id ?? generateTempId(),
      lotNumber: lotNumberTrimmed,
      expiryDate: expiryDate || null,
    });
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* Backdrop — clicking it closes the dialog */}
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />

        {/*
          We do NOT use DialogPrimitive.Popup because Base UI applies its own
          inline `position: fixed` + anchor coordinates that cannot be overridden
          with className. Instead we render a plain centering wrapper + div,
          which is fully RTL-safe.
        */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dialog panel */}
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-3xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-operational-cyan/10 rounded-xl text-operational-cyan shrink-0">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                    {t('lot_allocation_title') || 'Lot Allocation'}
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
                    {itemName}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-5">

              {/* Received qty banner */}
              <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {t('received_qty_label') || 'Received Quantity'}
                </span>
                <Badge variant="outline" className="font-mono font-bold text-base px-3 py-1 bg-background border-border text-foreground">
                  {receivedQty}
                </Badge>
              </div>

              {/* Lot Number */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5" />
                  {t('lot_number') || 'Lot Number'} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lot-number-input"
                  dir="ltr"
                  placeholder={t('lot_number_placeholder') || 'e.g. LOT-2024-001'}
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className={cn(
                    'h-11 font-mono bg-background border-input text-foreground focus:ring-1 focus:ring-brand-gold focus:border-brand-gold shadow-sm rounded-xl',
                    touched && !isLotNumberValid && 'border-destructive ring-1 ring-destructive'
                  )}
                  onBlur={() => setTouched(true)}
                />
                {touched && !isLotNumberValid && (
                  <p className="text-xs text-destructive font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('lot_number_required') || 'Lot number is required'}
                  </p>
                )}
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('expiry_date') || 'Expiry Date'}
                  <span className="text-muted-foreground/40 font-medium normal-case tracking-normal">
                    ({tc('optional') || 'optional'})
                  </span>
                </Label>
                <Input
                  id="expiry-date-input"
                  type="date"
                  dir="ltr"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={cn(
                    'h-11 font-mono bg-background border-input text-foreground focus:ring-1 focus:ring-brand-gold focus:border-brand-gold shadow-sm rounded-xl',
                    isExpiryInPast && 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/5'
                  )}
                />
                {isExpiryInPast && (
                  <p className="text-xs text-amber-500 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('expiry_date_in_past_warning') || 'This expiry date is in the past. Verify before saving.'}
                  </p>
                )}
              </div>

              {/* Allocation summary */}
              {isLotNumberValid && (
                <div className="flex items-center gap-3 bg-operational-cyan/5 border border-operational-cyan/20 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-operational-cyan shrink-0" />
                  <p className="text-xs font-semibold text-operational-cyan">
                    {t('lot_allocation_summary', {
                      qty: receivedQty,
                      lot: lotNumberTrimmed,
                    }) || `${receivedQty} units → ${lotNumberTrimmed}`}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t border-border/50">
              {currentLot && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClear}
                  className="w-full sm:w-auto shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs font-bold uppercase"
                >
                  <X className="w-3.5 h-3.5" />
                  {t('clear_lot') || 'Clear Lot'}
                </Button>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:ms-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full sm:w-auto shrink-0 text-xs font-bold uppercase"
                >
                  {tc('cancel') || 'Cancel'}
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full sm:w-auto shrink-0 bg-operational-cyan hover:brightness-110 text-white text-xs font-bold uppercase shadow-md shadow-operational-cyan/20 disabled:opacity-50"
                  disabled={touched && !isFormValid}
                >
                  <CheckCircle2 className="w-4 h-4 me-2" />
                  {t('confirm_allocation') || 'Confirm Allocation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
