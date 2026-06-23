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
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-3xl">
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
              triggerClassName="bg-gray-50 dark:bg-[#0B1220] border-gray-300 dark:border-gray-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label-xs font-semibold uppercase">{tc('currency')}</label>
            <SmartCombobox
              items={currencyItems}
              value={currencyId}
              onSelect={(item) => setCurrencyId(item.id)}
              placeholder={tc('select_currency')}
              triggerClassName="bg-gray-50 dark:bg-[#0B1220] border-gray-300 dark:border-gray-700"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border border-gray-300 dark:border-gray-700 hover:bg-gray-50 text-gray-700"
          >
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={handleConvert}
            disabled={!supplierId || !currencyId || convertMutation.isPending}
            className="bg-[#0B1220] dark:bg-[#b48e67] text-white dark:text-[#0B1220] hover:bg-gray-800 bg-none border-none shadow-none hover:scale-100 active:scale-100"
          >
            {convertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
            {t('convert')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
