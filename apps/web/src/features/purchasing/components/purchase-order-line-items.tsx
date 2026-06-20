"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations, useLocale } from "next-intl";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartCombobox, ComboboxItem } from "@/components/shared/SmartCombobox";
import {
 FormControl,
 FormField,
 FormItem,
 FormMessage,
} from "@/components/ui/form";
import { UseFormReturn, useWatch, FieldArrayWithId } from "react-hook-form";
import { Item } from "@/types/master-data";
import { cn } from "@/lib/utils";
import { PurchaseOrderFormValues } from "./purchase-order-form";

interface PurchaseOrderLineItemsProps {
 form: UseFormReturn<PurchaseOrderFormValues>;
 itemsData: { data: Item[] } | undefined;
 isLocked: boolean;
 currency: string;
 fields: FieldArrayWithId<PurchaseOrderFormValues, "lines", "id">[];
 remove: (index: number) => void;
 update: (index: number, value: PurchaseOrderFormValues['lines'][number]) => void;
 prepend: (value: PurchaseOrderFormValues['lines'][number]) => void;
}

export function PurchaseOrderLineItems({
 form,
 itemsData,
 isLocked,
 currency,
 fields,
 remove,
 update,
 prepend,
}: PurchaseOrderLineItemsProps) {
 const t = useTranslations("procurement.po");
 const tc = useTranslations("common");
 const locale = useLocale();

 const parentRef = React.useRef<HTMLDivElement>(null);
 const prevFieldsLength = React.useRef(fields.length);

 const virtualizer = useVirtualizer({
  count: fields.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
  overscan: 5,
 });

 // Scroll to top when new items are added (prepended)
 React.useEffect(() => {
  if (fields.length > prevFieldsLength.current) {
   virtualizer.scrollToIndex(0);
  }
  prevFieldsLength.current = fields.length;
 }, [fields.length, virtualizer]);
 const comboboxItems = React.useMemo(() => {
  return itemsData?.data?.map((i: Item) => {
   const displayName = i.name || '';
   return {
    id: i.id,
    name: `${i.code} - ${displayName}`,
    name_en: `${i.code} - ${displayName}`,
    name_ar: `${i.code} - ${displayName}`,
   };
  }) ?? [];
 }, [itemsData?.data]);

 return (
  <div className="w-full space-y-4">
   <div className="flex justify-between items-center mb-6 px-2">
    <h3 className="text-title-lg font-semibold uppercase flex items-center gap-3">
     <span className="w-2 h-2 bg-operational-cyan rounded-full animate-pulse shadow-[0_0_10px_var(--operational-cyan)]" />
     {t('line_items')}
     <span className="text-muted-foreground/30 font-mono text-label-xs ms-2">[{fields.length}]</span>
    </h3>
   </div>

   <div className="w-full rounded-2xl bg-card border border-border shadow-sm/20 border border-white/5 backdrop-blur-md shadow-inner overflow-hidden">
    <div
     ref={parentRef}
     className="w-full h-[500px] overflow-auto scrollbar-thin"
    >
     <div
      style={{
       height: `${virtualizer.getTotalSize() + 56}px`, // + header height
       width: "100%",
       minWidth: "1000px",
       position: "relative",
      }}
     >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface-container-high/90 backdrop-blur-xl shadow-sm flex border-b border-white/5 min-w-[1000px] h-14 start-0 w-full">
       <div className="px-6 py-4 text-label-xs font-bold uppercase text-muted-foreground/50 flex-[3] text-start border-e border-white/5 min-w-[300px]">{tc('table_headers.item')}</div>
       <div className="px-4 py-4 text-label-xs font-bold uppercase text-muted-foreground/50 text-center w-28 border-e border-white/5">{t('quantity')}</div>
       <div className="px-4 py-4 text-label-xs font-bold uppercase text-muted-foreground/50 text-center w-28 border-e border-white/5">{tc('uom.label')}</div>
       <div className="px-4 py-4 text-label-xs font-bold uppercase text-muted-foreground/50 text-center w-36 border-e border-white/5">{t('unit_price')} {currency ? `(${currency})` : ''}</div>
       <div className="px-6 py-4 text-label-xs font-bold uppercase text-muted-foreground/50 flex-[2] text-start border-e border-white/5 min-w-[200px]">{tc('table_headers.notes') || t('line_notes')}</div>
       {!isLocked && <div className="px-6 py-4 w-16" />}
      </div>

      {virtualizer.getVirtualItems().map((virtualRow) => {
       const index = virtualRow.index;
       const field = fields[index];

       return (
        <LineItemRow
         key={field.id}
         index={index}
         form={form}
         itemsData={itemsData}
         comboboxItems={comboboxItems}
         isLocked={isLocked}
         remove={remove}
         update={update}
         virtualRow={virtualRow}
         t={t}
         tc={tc}
         locale={locale}
        />
       );
      })}
     </div>
    </div>
   </div>

   <style jsx>{`
    .scrollbar-thin::-webkit-scrollbar {
     width: 6px;
     height: 6px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
     background: transparent;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
     background: rgba(var(--operational-cyan-rgb), 0.1);
     border-radius: 10px;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
     background: rgba(var(--operational-cyan-rgb), 0.2);
    }
   `}</style>
  </div>
 );
}

interface LineItemRowProps {
 index: number;
 form: UseFormReturn<PurchaseOrderFormValues>;
 itemsData: { data: Item[] } | undefined;
 comboboxItems: ComboboxItem[];
 isLocked: boolean;
 remove: (index: number) => void;
 update: (index: number, value: PurchaseOrderFormValues['lines'][number]) => void;
 virtualRow: { start: number };
 t: (key: string) => string;
 tc: (key: string) => string;
 locale: string;
}

function LineItemRow({
 index,
 form,
 itemsData,
 comboboxItems,
 isLocked,
 remove,
 update,
 virtualRow,
 t,
 tc,
 locale,
}: LineItemRowProps) {
 const rowValues = useWatch({
  control: form.control,
  name: `lines.${index}`,
 });

 return (
  <div
   data-index={index}
   className="absolute top-0 start-0 w-full min-w-[1000px] border-b border-white/5 transition-all hover:bg-surface-container-high/40 flex items-center h-[80px] group"
   style={{
    transform: `translateY(${virtualRow.start + 56}px)`, // Offset by header height
   }}
  >
   <div className="px-6 py-3 flex-[3] border-e border-white/5 h-full flex items-center min-w-[300px]">
    <FormField
     control={form.control}
     name={`lines.${index}.itemId`}
     render={({ field: inputField }) => (
      <FormItem className="space-y-0 w-full">
       <FormControl>
        <SmartCombobox
         items={comboboxItems}
         value={inputField.value}
         onSelect={(item) => {
          const matchedItem = itemsData?.data?.find((i: Item) => i.id === item.id);
          if (matchedItem) {
           update(index, {
            itemId: matchedItem.id,
            itemName: matchedItem.name,
            itemCode: matchedItem.code,
            uomId: matchedItem.primaryUom?.id || 'PCS',
            unitPrice: matchedItem.lastPurchasePrice || 0,
            quantity: rowValues?.quantity || 1,
            notes: rowValues?.notes || ''
           });
          }
         }}
         placeholder={tc('select_item')}
         className="h-11 w-full bg-surface-container-high rounded-xl text-body-sm font-bold uppercase transition-all group-hover:bg-surface-container-highest shadow-sm"
         disabled={isLocked}
        />
       </FormControl>
       <FormMessage className="text-[10px] mt-1" />
      </FormItem>
     )}
    />
   </div>

   <div className="px-4 py-3 w-28 text-center border-e border-white/5 h-full flex items-center justify-center">
    <FormField
     control={form.control}
     name={`lines.${index}.quantity`}
     render={({ field: inputField }) => (
      <FormItem className="space-y-0 w-full">
       <FormControl>
        <Input
         type="number"
         min="1"
         disabled={isLocked}
         className="bg-card font-mono h-11 rounded-xl text-body-sm font-bold text-center transition-all group-hover:bg-surface-container-high"
         dir="ltr"
         {...inputField}
         onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
        />
       </FormControl>
       <FormMessage className="text-[10px] mt-1" />
      </FormItem>
     )}
    />
   </div>

    <div className="px-4 py-3 w-28 border-e border-white/5 h-full flex items-center justify-center">
     <FormField
      control={form.control}
      name={`lines.${index}.uomId`}
      render={({ field: inputField }) => {
       const matchedItem = itemsData?.data?.find((i) => i.id === rowValues?.itemId);
       const uomCode = matchedItem?.primaryUom?.code || (inputField.value && inputField.value.length === 36 ? '...' : (inputField.value || 'PCS'));
       return (
        <FormItem className="space-y-0 w-full">
         <FormControl>
          <div className="h-11 w-full flex items-center justify-center px-2 bg-surface-container-high/20 rounded-xl font-mono uppercase text-[11px] font-black text-muted-foreground/40 border border-white/5">
           {uomCode}
          </div>
         </FormControl>
         <FormMessage className="text-[10px] mt-1" />
        </FormItem>
       );
      }}
     />
    </div>

   <div className="px-4 py-3 w-36 text-center border-e border-white/5 h-full flex items-center justify-center">
    <FormField
     control={form.control}
     name={`lines.${index}.unitPrice`}
     render={({ field: inputField }) => (
      <FormItem className="space-y-0 w-full">
       <FormControl>
        <Input
         type="number"
         step="0.01"
         min="0"
         disabled={isLocked}
         className="bg-card font-mono h-11 rounded-xl text-body-sm font-bold text-center transition-all group-hover:bg-surface-container-high"
         dir="ltr"
         {...inputField}
         onChange={(e) => inputField.onChange(e.target.valueAsNumber)}
        />
       </FormControl>
       <FormMessage className="text-[10px] mt-1" />
      </FormItem>
     )}
    />
   </div>

   <div className="px-6 py-3 flex-[2] border-e border-white/5 h-full flex items-center min-w-[200px]">
    <FormField
     control={form.control}
     name={`lines.${index}.notes`}
     render={({ field: inputField }) => (
      <FormItem className="space-y-0 w-full">
       <FormControl>
        <Input
         placeholder={t('notes_placeholder')}
         disabled={isLocked}
         className="bg-card h-11 rounded-xl text-body-sm font-medium transition-all group-hover:bg-surface-container-high"
         {...inputField}
        />
       </FormControl>
       <FormMessage className="text-[10px] mt-1" />
      </FormItem>
     )}
    />
   </div>

    {!isLocked && (
     <div className="px-6 py-3 w-16 text-center h-full flex items-center justify-center">
      <Button
       type="button"
       variant="ghost"
       size="icon"
       className="text-muted-foreground/20 hover:text-status-error hover:bg-status-error/10 h-10 w-10 transition-all rounded-xl"
       onClick={() => remove(index)}
       disabled={!(form.getValues('lines')) || form.getValues('lines').length <= 1}
      >
       <Trash2 className="h-4 w-4" />
      </Button>
     </div>
    )}
  </div>
 );
}
