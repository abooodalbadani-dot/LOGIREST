'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUoMs } from '@/features/uoms/hooks/useUoMs';
import { Package, Tag, FileText } from 'lucide-react';

interface CreateCustomItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  onCreate: (item: {
    id: string;
    code: string;
    barcode: string;
    name_en: string;
    name_ar: string;
    primary_uom: { id: string; code: string };
  }) => void;
}

export function CreateCustomItemDialog({
  isOpen,
  onClose,
  defaultName,
  onCreate,
}: CreateCustomItemDialogProps) {
  const tCommon = useTranslations('common');
  const { data: uomsResult, isLoading: isLoadingUoMs } = useUoMs();
  
  const uoms = uomsResult?.data || [];
  const activeUoMs = uoms.filter(u => u.is_active !== false);

  const isArabic = /[\u0600-\u06FF]/.test(defaultName);
  const [nameEn, setNameEn] = useState(() => isArabic ? '' : defaultName);
  const [nameAr, setNameAr] = useState(() => isArabic ? defaultName : '');
  const [barcode, setBarcode] = useState(() => 'CUST-' + Math.floor(1000000000 + Math.random() * 9000000000).toString());
  const [selectedUomId, setSelectedUomId] = useState<string | null>(null);

  // Derive the active UOM ID during render
  const derivedUomId = React.useMemo(() => {
    if (selectedUomId) return selectedUomId;
    if (activeUoMs.length > 0) {
      const pcsUom = activeUoMs.find(u => u.code.toLowerCase() === 'pcs' || u.code.toLowerCase() === 'piece' || u.code === 'حبة');
      return pcsUom?.id || activeUoMs[0].id;
    }
    return '';
  }, [selectedUomId, activeUoMs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn && !nameAr) return;

    const selectedUom = activeUoMs.find(u => u.id === derivedUomId) || { id: 'temp-uom', code: 'pcs' };
    const tempId = `cust-${crypto.randomUUID()}`;
    const code = barcode || `CUST-CODE-${Date.now()}`;

    onCreate({
      id: tempId,
      code,
      barcode: barcode || code,
      name_en: nameEn || nameAr,
      name_ar: nameAr || nameEn,
      primary_uom: {
        id: selectedUom.id,
        code: selectedUom.code,
      },
    });
    
    onClose();
  };

  const isFormValid = nameEn.trim().length > 0 || nameAr.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-surface-container-highest border border-surface-container-high/60 shadow-2xl rounded-3xl overflow-hidden p-6 gap-6">
        <DialogHeader className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-operational-cyan/15 flex items-center justify-center">
              <Package className="w-5 h-5 text-operational-cyan" />
            </div>
            <div>
              <DialogTitle className="text-title-sm font-heading font-bold text-foreground">
                {tCommon('add_custom_item') || 'Create Custom Item'}
              </DialogTitle>
              <DialogDescription className="text-body-sm text-muted-foreground/60">
                {tCommon('add_custom_item_desc') || 'Define a temporary custom item for this document.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            {/* English Name */}
            <div className="space-y-2">
              <Label htmlFor="nameEn" className="text-label-xs font-semibold uppercase text-muted-foreground/70 ms-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                English Name
              </Label>
              <Input
                id="nameEn"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Fresh Tomatoes"
                className="bg-surface-container-low/40 border border-white/5 h-11 px-4 text-body-md font-bold rounded-2xl focus-visible:ring-2 focus-visible:ring-operational-cyan/20 outline-none"
              />
            </div>

            {/* Arabic Name */}
            <div className="space-y-2">
              <Label htmlFor="nameAr" className="text-label-xs font-semibold uppercase text-muted-foreground/70 ms-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                الاسم بالعربية
              </Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: طماطم طازجة"
                className="bg-surface-container-low/40 border border-white/5 h-11 px-4 text-body-md font-bold rounded-2xl focus-visible:ring-2 focus-visible:ring-operational-cyan/20 outline-none text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Barcode/Code */}
              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-label-xs font-semibold uppercase text-muted-foreground/70 ms-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Barcode / Code
                </Label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode..."
                  className="bg-surface-container-low/40 border border-white/5 h-11 px-4 text-body-md font-bold rounded-2xl focus-visible:ring-2 focus-visible:ring-operational-cyan/20 outline-none font-mono"
                />
              </div>

              {/* UOM */}
              <div className="space-y-2">
                <Label htmlFor="uom" className="text-label-xs font-semibold uppercase text-muted-foreground/70 ms-1 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Primary UOM
                </Label>
                <Select value={derivedUomId} onValueChange={(val) => setSelectedUomId(val || null)}>
                  <SelectTrigger id="uom" className="bg-surface-container-low/40 border-none h-11 px-4 text-body-md font-bold rounded-2xl focus:ring-2 focus:ring-operational-cyan/20">
                    <SelectValue placeholder="Select UOM" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-container-highest border border-surface-container-high/50 shadow-2xl rounded-2xl">
                    {activeUoMs.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-label-sm font-bold py-2 focus:bg-operational-cyan/10 focus:text-operational-cyan">
                        {u.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-row justify-end gap-3 -mx-6 -mb-6 p-4 rounded-b-[var(--radius)] bg-surface-container-low">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground font-bold"
            >
              {tCommon('dialog.cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid}
              className="bg-operational-cyan hover:bg-operational-cyan/90 text-black font-bold px-6 rounded-2xl"
            >
              {tCommon('add') || 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
