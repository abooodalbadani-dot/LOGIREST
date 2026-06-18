import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataCRUD';
import { SupplierSchema, CurrencySchema, Supplier, Currency } from '@/types/master-data';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { useConvertToPO } from '@/features/purchasing/hooks/useConvertToPO';
import { Loader2 } from 'lucide-react';
import { PRDetail } from '@/features/purchasing/hooks/usePR';
import { toast } from 'sonner';

interface ConvertToPOModalProps {
  pr: PRDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertToPOModal({ pr, open, onOpenChange }: ConvertToPOModalProps) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const [supplierId, setSupplierId] = useState('');
  const [currencyId, setCurrencyId] = useState('');

  const { data: suppliersData } = useMasterDataList('suppliers', SupplierSchema);
  const { data: currenciesData } = useMasterDataList('currencies', CurrencySchema);

  const convertMutation = useConvertToPO(pr.id);

  const supplierItems = (suppliersData?.data || []).map((s: Supplier) => ({
    id: s.id,
    name: s.name,
    name_ar: s.name,
    name_en: s.name,
  }));

  const currencyItems = (currenciesData?.data || []).map((c: Currency) => ({
    id: c.id,
    name: `${c.code} - ${c.name}`,
    name_ar: c.name,
    name_en: c.name,
  }));

  const handleConvert = () => {
    if (!supplierId || !currencyId) {
      toast.error(tc('validation.required'));
      return;
    }

    convertMutation.mutate({
      supplierId,
      currencyId,
      lines: pr.lines.map(l => ({ itemId: l.item.id, unitPrice: 0 })),
      version: pr.version ?? 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('convert_to_po')}</DialogTitle>
          <DialogDescription>
            {t('convert_to_po_desc')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-label-xs font-semibold uppercase">{tc('supplier')}</label>
            <SmartCombobox
              items={supplierItems}
              value={supplierId}
              onSelect={(item) => setSupplierId(item.id)}
              placeholder={tc('select_supplier')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-xs font-semibold uppercase">{tc('currency')}</label>
            <SmartCombobox
              items={currencyItems}
              value={currencyId}
              onSelect={(item) => setCurrencyId(item.id)}
              placeholder={tc('select_currency')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.cancel')}
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={!supplierId || !currencyId || convertMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {convertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
            {t('convert')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
