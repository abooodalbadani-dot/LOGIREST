'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { useCreatePO } from '@/features/purchasing/hooks/useCreatePO';
import { usePostPO } from '@/features/purchasing/hooks/usePostPO';
import { useSuppliers } from '@/features/purchasing/hooks/useSuppliers';
import { useCurrencies } from '@/features/purchasing/hooks/useCurrencies';
import { useFXRates } from '@/features/purchasing/hooks/useFXRates';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Save, Send } from 'lucide-react';

export function PODetailClient({ id }: { id: string | null }) {
  const t = useTranslations('procurement.po');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledPrId = searchParams?.get('pr_id');
  
  const { data: po, isLoading } = usePO(id || '');
  const { data: suppliers } = useSuppliers();
  const { data: currencies } = useCurrencies();
  
  const createPOMutation = useCreatePO();
  const postPOMutation = usePostPO();

  const [postConfirmOpen, setPostConfirmOpen] = useState(false);
  
  // Local state for new PO
  const [supplierId, setSupplierId] = useState(po?.supplier_id || '');
  const [currencyId, setCurrencyId] = useState(po?.currency_id || 'USD');
  const [deliveryDate, setDeliveryDate] = useState(po?.expected_delivery_date || '');

  // Live FX conversion logic
  const baseCurrency = currencies?.find(c => c.is_base)?.code || 'SAR';
  const { data: fxRates } = useFXRates(currencyId, baseCurrency);
  const currentFxRate = fxRates?.[0]?.rate || 1;

  const isNew = !id;
  const isReadOnly = !isNew && po?.status !== 'DRAFT';

  // Calculate local totals
  const totalForeign = useMemo(() => {
    if (!po?.lines) return 0;
    return po.lines.reduce((acc, line) => acc + (line.qty * line.unit_cost_foreign), 0);
  }, [po?.lines]);

  const handleSaveDraft = async () => {
    try {
      await createPOMutation.mutateAsync({
        supplier_id: supplierId || 'sup-1',
        target_warehouse_id: 'wh-1',
        currency_id: currencyId || 'USD',
        expected_delivery_date: deliveryDate,
        linked_pr_id: prefilledPrId || undefined,
        lines: [] // In a real app, this would be editable lines state
      });
      router.push('/purchase-orders');
    } catch (e) {
      console.error(e);
    }
  };

  const handlePost = async () => {
    if (!id) return;
    try {
      await postPOMutation.mutateAsync(id);
      setPostConfirmOpen(false);
      // Success path leads to GRN pre-filled with this PO
      router.push(`/goods-received/new?po_id=${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {!isNew && (
              <span dir="ltr" className="font-mono text-primary">
                {po?.document_number}
              </span>
            )}
            {!isNew && (
              <Badge variant={
                po?.status === 'POSTED' ? 'default' : 
                'secondary'
              }>
                {tCommon(`status.${po?.status.toLowerCase()}` as any) || po?.status}
              </Badge>
            )}
            {isNew && <span>{t('create_new')}</span>}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 relative z-20">
          {(isNew || po?.status === 'DRAFT') && (
            <Button onClick={handleSaveDraft} disabled={createPOMutation.isPending} variant="outline">
              <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('save_draft') || 'Save Draft'}
            </Button>
          )}
          {!isNew && !isReadOnly && (
            <Button onClick={() => setPostConfirmOpen(true)}>
              <Send className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t('post_po') || 'Post'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Supplier Selector */}
        <div className="bg-card p-4 rounded-lg border flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">{t('supplier') || 'Supplier'}</label>
          {isReadOnly ? (
             <p className="font-medium">{suppliers?.find(s => s.id === po?.supplier_id)?.name_en || po?.supplier_id}</p>
          ) : (
            <select 
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="p-2 bg-surface-2 border border-surface-3 rounded focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Select Supplier</option>
              {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
            </select>
          )}
        </div>

        {/* Currency Selector */}
        <div className="bg-card p-4 rounded-lg border flex flex-col gap-2">
           <label className="text-sm text-muted-foreground">Currency</label>
           {isReadOnly ? (
             <p className="font-medium">{po?.currency_id}</p>
           ) : (
            <select 
              value={currencyId}
              onChange={(e) => setCurrencyId(e.target.value)}
              className="p-2 bg-surface-2 border border-surface-3 rounded focus:ring-1 focus:ring-primary outline-none"
            >
              {currencies?.map(c => <option key={c.id} value={c.code}>{c.code} - {c.name}</option>)}
            </select>
           )}
        </div>

        {/* Expected Delivery Date */}
        <div className="bg-card p-4 rounded-lg border flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">{t('expected_delivery_date') || 'Expected Delivery'}</label>
          {isReadOnly ? (
             <p className="font-medium">{po?.expected_delivery_date || '-'}</p>
          ) : (
            <input 
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="p-2 bg-surface-2 border border-surface-3 rounded focus:ring-1 focus:ring-primary outline-none"
            />
          )}
        </div>

        {/* Linked PR */}
        <div className="bg-card p-4 rounded-lg border flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">Linked PR</label>
          {po?.linked_pr_number ? (
            <Badge variant="outline" className="w-fit">{po.linked_pr_number}</Badge>
          ) : prefilledPrId ? (
            <Badge variant="outline" className="w-fit border-dashed">Pending Linking</Badge>
          ) : (
            <p className="font-medium text-muted-foreground">-</p>
          )}
        </div>
      </div>

      <DocumentReadOnlyOverlay isPosted={isReadOnly}>
        <DocumentLineItemTable
          lines={(po?.lines as any) || []}
          locale="en"
          isReadOnly={isReadOnly}
          extraColumns={[
            {
              header: "Ordered Qty",
              cell: (line: any) => isReadOnly ? (
                 <span dir="ltr" className="font-mono">{line.qty} {line.uom_id}</span>
              ) : (
                <input type="number" defaultValue={line.qty} className="w-20 px-2 py-1 bg-surface-2 border border-surface-3 rounded" dir="ltr" />
              )
            },
            {
              header: `Unit Price (${currencyId})`,
              cell: (line: any) => isReadOnly ? (
                 <span dir="ltr" className="font-mono">{line.unit_cost_foreign}</span>
              ) : (
                <input type="number" defaultValue={line.unit_cost_foreign} className="w-24 px-2 py-1 bg-surface-2 border border-surface-3 rounded" dir="ltr" />
              )
            },
            {
              header: `Total (${currencyId})`,
              cell: (line: any) => (
                <span dir="ltr" className="font-mono font-medium">
                  {((line.qty || 0) * (line.unit_cost_foreign || 0)).toLocaleString()}
                </span>
              )
            }
          ]}
        />
      </DocumentReadOnlyOverlay>

      {/* Live FX Output */}
      <div className="flex justify-end pr-4">
        <div className="bg-card p-4 rounded-lg border text-right">
          <p className="text-sm text-muted-foreground mb-1">Total ({currencyId})</p>
          <p dir="ltr" className="text-xl font-mono font-semibold mb-2">{(totalForeign || po?.total || 0).toLocaleString()}</p>
          
          <div className="h-px bg-border w-full my-2" />
          
          <p className="text-xs text-muted-foreground">Live FX Rate: 1 {currencyId} = {currentFxRate} {baseCurrency}</p>
          <p className="text-sm font-medium mt-1">الإجمالي بالعملة المحلية: <span dir="ltr" className="font-mono">{((totalForeign || po?.total || 0) * currentFxRate).toLocaleString()} {baseCurrency}</span></p>
        </div>
      </div>

      <PostConfirmDialog 
        open={postConfirmOpen}
        onOpenChange={setPostConfirmOpen}
        onConfirm={handlePost}
        title={t('post_confirm_title') || 'Post Purchase Order?'}
        description={t('post_confirm_desc') || 'Are you sure you want to post this PO?'}
        warningText="This action cannot be undone and will transition the document to POSTED state."
      />
    </div>
  );
}
