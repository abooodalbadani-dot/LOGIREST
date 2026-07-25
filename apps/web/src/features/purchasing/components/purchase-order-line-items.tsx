"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
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
}: PurchaseOrderLineItemsProps) {
       const t = useTranslations("procurement.po");
       const tc = useTranslations("common");

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
                     <div className="flex flex-wrap justify-between items-center mb-6 px-2 gap-4">
                            <h3 className="text-lg md:text-title-lg font-semibold uppercase flex items-center gap-3 truncate">
                                   <span className="w-2 h-2 bg-operational-cyan rounded-full animate-pulse shadow-[0_0_10px_var(--operational-cyan)]" />
                                   {t('line_items')}
                                   <span className="text-muted-foreground/30 font-mono text-label-xs ms-2">[{fields.length}]</span>
                            </h3>
                     </div>

                     {/* Mobile Card List View */}
                     <div className="block md:hidden space-y-4 px-2">
                            {fields.map((field, index) => (
                                   <LineItemCard
                                          key={field.id}
                                          index={index}
                                          form={form}
                                          itemsData={itemsData}
                                          comboboxItems={comboboxItems}
                                          isLocked={isLocked}
                                          remove={remove}
                                          update={update}
                                          t={t}
                                          tc={tc}
                                          currency={currency}
                                          fieldsCount={fields.length}
                                   />
                            ))}
                     </div>

                     {/* Desktop Virtualized Grid View */}
                     <div className="hidden md:block w-full rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
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
                                          <div className="sticky top-0 z-20 bg-muted/60 backdrop-blur-xl shadow-sm flex border-b border-border min-w-[1000px] h-14 start-0 w-full">
                                                 <div className="px-6 py-4 text-label-xs font-bold uppercase text-muted-foreground flex-[3] text-start border-e border-border/60 min-w-[340px]">{tc('table_headers.item')}</div>
                                                 <div className="px-4 py-4 text-label-xs font-bold uppercase text-muted-foreground text-center w-28 border-e border-border/60">{t('quantity')}</div>
                                                 <div className="px-4 py-4 text-label-xs font-bold uppercase text-muted-foreground text-center w-28 border-e border-border/60">{tc('uom.label')}</div>
                                                 <div className="px-4 py-4 text-label-xs font-bold uppercase text-muted-foreground text-center w-36 border-e border-border/60">{t('unit_price')} {currency ? `(${currency})` : ''}</div>
                                                 <div className="px-6 py-4 text-label-xs font-bold uppercase text-muted-foreground flex-[2] text-start border-e border-border/60 min-w-[200px]">{tc('table_headers.notes') || t('line_notes')}</div>
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
                                                               fieldsCount={fields.length}
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

interface LineItemCardProps {
       index: number;
       form: UseFormReturn<PurchaseOrderFormValues>;
       itemsData: { data: Item[] } | undefined;
       comboboxItems: ComboboxItem[];
       isLocked: boolean;
       remove: (index: number) => void;
       update: (index: number, value: PurchaseOrderFormValues['lines'][number]) => void;
       t: (key: string) => string;
       tc: (key: string) => string;
       currency: string;
       fieldsCount: number;
}

function LineItemCard({
       index,
       form,
       itemsData,
       comboboxItems,
       isLocked,
       remove,
       update,
       t,
       tc,
}: LineItemCardProps) {
       const rowValues = useWatch({
              control: form.control,
              name: `lines.${index}`,
       });

       const matchedItem = itemsData?.data?.find((i) => i.id === rowValues?.itemId);

       return (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-3 space-y-2.5 transition-all">
                     {/* Header: Product Image + SmartCombobox Item Selector + Delete Button */}
                     <div className="flex items-center gap-2.5">
                            {/* Product Image */}
                            {(matchedItem?.image || matchedItem?.imageUrl) ? (
                                   <img src={(matchedItem?.image || matchedItem?.imageUrl)!} alt="Product" className="w-10 h-10 object-cover rounded-lg border border-border shrink-0 shadow-sm" />
                            ) : (
                                   <div className="w-10 h-10 bg-surface flex items-center justify-center rounded-lg border border-border text-[9px] text-muted-foreground font-mono shrink-0">
                                          N/A
                                   </div>
                            )}

                            {/* Item Selector (Combobox) */}
                            <div className="flex-1 min-w-0">
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
                                                                             const selected = itemsData?.data?.find((i: Item) => i.id === item.id);
                                                                             if (selected) {
                                                                                    const rawPrice = selected.lastPurchasePrice;
                                                                                    const safePrice = (rawPrice === undefined || rawPrice === null || Number.isNaN(rawPrice)) ? "" : rawPrice;

                                                                                    update(index, {
                                                                                           itemId: selected.id,
                                                                                           itemName: selected.name,
                                                                                           itemCode: selected.code,
                                                                                           uomId: selected.primaryUom?.id || 'PCS',
                                                                                           unitPrice: safePrice as unknown as number,
                                                                                           quantity: rowValues?.quantity || 1,
                                                                                           notes: rowValues?.notes || ''
                                                                                    });
                                                                             }
                                                                      }}
                                                                      placeholder={tc('select_item')}
                                                                      triggerClassName="h-10 bg-background border border-border text-foreground rounded-lg text-xs font-bold uppercase shadow-sm focus:ring-2 focus:ring-cyan-500/20"
                                                                      disabled={isLocked}
                                                               />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-0.5" />
                                                 </FormItem>
                                          )}
                                   />
                            </div>

                            {/* Delete Action Button */}
                            {!isLocked && (
                                   <button 
                                          type="button" 
                                          className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-lg transition-colors flex items-center justify-center shrink-0" 
                                          onClick={() => remove(index)}
                                          aria-label={tc('actions.remove_line')}
                                   >
                                          <Trash2 className="w-4 h-4" />
                                   </button>
                            )}
                     </div>

                     {/* Compact Body Container: QTY, UOM, Unit Price, Notes */}
                     <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5 space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                   {/* Quantity */}
                                   <div className="flex flex-col col-span-1">
                                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                                                 {t('quantity')}
                                          </span>
                                          <FormField
                                                 control={form.control}
                                                 name={`lines.${index}.quantity`}
                                                 render={({ field: inputField }) => (
                                                        <FormItem className="space-y-0 w-full">
                                                               <FormControl>
                                                                      <Input
                                                                             type="text"
                                                                             inputMode="decimal"
                                                                             disabled={isLocked}
                                                                             className="h-8 w-full text-center font-mono text-xs font-bold text-foreground bg-background border border-border rounded-md focus:ring-1 focus:ring-cyan-500/30 outline-none"
                                                                             value={inputField.value === undefined || inputField.value === null || (typeof inputField.value === 'number' && Number.isNaN(inputField.value)) ? "" : inputField.value}
                                                                             onChange={(e) => {
                                                                                    let val = e.target.value.replace(/[^0-9.]/g, '');
                                                                                    const parts = val.split('.');
                                                                                    if (parts.length > 2) {
                                                                                           val = parts[0] + '.' + parts.slice(1).join('');
                                                                                    }
                                                                                    inputField.onChange(val);
                                                                             }}
                                                                      />
                                                               </FormControl>
                                                               <FormMessage className="text-[10px] mt-0.5" />
                                                        </FormItem>
                                                 )}
                                          />
                                   </div>

                                   {/* UOM */}
                                   <div className="flex flex-col col-span-1">
                                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                                                 {tc('uom.label')}
                                          </span>
                                          <FormField
                                                 control={form.control}
                                                 name={`lines.${index}.uomId`}
                                                 render={({ field: inputField }) => {
                                                        const uomCode = matchedItem?.primaryUom?.code || (inputField.value && inputField.value.length === 36 ? '...' : (inputField.value || 'PCS'));
                                                        return (
                                                               <FormItem className="space-y-0 w-full">
                                                                      <FormControl>
                                                                             <div className="h-8 w-full flex items-center justify-center bg-background border border-border text-foreground rounded-md font-mono uppercase text-[10px] font-bold">
                                                                                    {uomCode}
                                                                             </div>
                                                                      </FormControl>
                                                                      <FormMessage className="text-[10px] mt-0.5" />
                                                               </FormItem>
                                                        );
                                                 }}
                                          />
                                   </div>

                                   {/* Unit Price */}
                                   <div className="flex flex-col col-span-1">
                                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                                                 {t('unit_price')}
                                          </span>
                                          <FormField
                                                 control={form.control}
                                                 name={`lines.${index}.unitPrice`}
                                                 render={({ field: inputField }) => (
                                                        <FormItem className="space-y-0 w-full">
                                                               <FormControl>
                                                                      <Input
                                                                             type="text"
                                                                             inputMode="decimal"
                                                                             disabled={isLocked}
                                                                             className="h-8 w-full text-center font-mono text-xs font-bold text-foreground bg-background border border-border rounded-md focus:ring-1 focus:ring-cyan-500/30 outline-none"
                                                                             value={inputField.value === undefined || inputField.value === null || (typeof inputField.value === 'number' && Number.isNaN(inputField.value)) ? "" : inputField.value}
                                                                             onChange={(e) => {
                                                                                    let val = e.target.value.replace(/[^0-9.]/g, '');
                                                                                    const parts = val.split('.');
                                                                                    if (parts.length > 2) {
                                                                                           val = parts[0] + '.' + parts.slice(1).join('');
                                                                                    }
                                                                                    inputField.onChange(val);
                                                                             }}
                                                                      />
                                                               </FormControl>
                                                               <FormMessage className="text-[10px] mt-0.5" />
                                                        </FormItem>
                                                 )}
                                          />
                                   </div>
                            </div>

                            {/* Notes Input */}
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.notes`}
                                   render={({ field: inputField }) => (
                                          <FormItem className="space-y-0 w-full">
                                                 <FormControl>
                                                        <Input
                                                               placeholder={t('notes_placeholder') || tc('table_headers.notes')}
                                                               disabled={isLocked}
                                                               className="h-8 w-full px-2.5 text-xs font-medium text-foreground bg-background border border-border rounded-md focus:ring-1 focus:ring-cyan-500/30 outline-none"
                                                               value={inputField.value || ''}
                                                               onChange={(e) => inputField.onChange(e.target.value)}
                                                        />
                                                 </FormControl>
                                                 <FormMessage className="text-[10px] mt-0.5" />
                                          </FormItem>
                                   )}
                            />
                     </div>
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
       fieldsCount: number;
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
}: LineItemRowProps) {
       const rowValues = useWatch({
              control: form.control,
              name: `lines.${index}`,
       });
       const matchedItem = itemsData?.data?.find((i) => i.id === rowValues?.itemId);

       return (
              <div
                     data-index={index}
                     className="absolute top-0 start-0 w-full min-w-[1000px] border-b border-border/60 transition-all hover:bg-primary/[0.04] flex items-center h-[80px] group"
                     style={{
                                                                             transform: `translateY(${virtualRow.start + 56}px)`, // Offset by header height
                     }}
              >
                     {/* Item Selection + Product Image */}
                     <div className="px-6 py-3 flex-[3] border-e border-border/60 h-full flex items-center gap-3 min-w-[340px]">
                            {(matchedItem?.image || matchedItem?.imageUrl) ? (
                                   <img src={(matchedItem?.image || matchedItem?.imageUrl)!} alt="Product" className="w-10 h-10 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                            ) : (
                                   <div className="w-10 h-10 bg-surface flex items-center justify-center rounded-xl border border-border text-[9px] text-muted-foreground font-mono shrink-0">N/A</div>
                            )}
                            <div className="flex-1 min-w-0">
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
                                                                             const selected = itemsData?.data?.find((i: Item) => i.id === item.id);
                                                                             if (selected) {
                                                                                    const rawPrice = selected.lastPurchasePrice;
                                                                                    const safePrice = (rawPrice === undefined || rawPrice === null || Number.isNaN(rawPrice)) ? "" : rawPrice;

                                                                                    update(index, {
                                                                                           itemId: selected.id,
                                                                                           itemName: selected.name,
                                                                                           itemCode: selected.code,
                                                                                           uomId: selected.primaryUom?.id || 'PCS',
                                                                                           unitPrice: safePrice as unknown as number,
                                                                                           quantity: rowValues?.quantity || 1,
                                                                                           notes: rowValues?.notes || ''
                                                                                    });
                                                                             }
                                                                      }}
                                                                      placeholder={tc('select_item')}
                                                                      triggerClassName="h-10 w-full bg-background border border-border text-foreground rounded-xl text-xs font-bold uppercase transition-all shadow-sm focus:ring-2 focus:ring-cyan-500/20"
                                                                      disabled={isLocked}
                                                               />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-1" />
                                                 </FormItem>
                                          )}
                                   />
                            </div>
                     </div>

                     {/* Quantity */}
                     <div className="px-4 py-3 w-28 text-center border-e border-border/60 h-full flex items-center justify-center">
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.quantity`}
                                   render={({ field: inputField }) => (
                                          <FormItem className="space-y-0 w-full">
                                                 <FormControl>
                                                        <Input
                                                               {...inputField}
                                                               type="text"
                                                               inputMode="decimal"
                                                               disabled={isLocked}
                                                               className="bg-background border border-border text-foreground font-mono h-10 rounded-xl text-xs font-bold text-center transition-all focus:ring-2 focus:ring-cyan-500/20"
                                                               dir="ltr"
                                                               value={inputField.value === undefined || inputField.value === null || (typeof inputField.value === 'number' && Number.isNaN(inputField.value)) ? "" : inputField.value}
                                                               onChange={(e) => {
                                                                      let val = e.target.value.replace(/[^0-9.]/g, '');
                                                                      const parts = val.split('.');
                                                                      if (parts.length > 2) {
                                                                             val = parts[0] + '.' + parts.slice(1).join('');
                                                                      }
                                                                      inputField.onChange(val);
                                                               }}
                                                        />
                                                 </FormControl>
                                                 <FormMessage className="text-[10px] mt-1" />
                                          </FormItem>
                                   )}
                            />
                     </div>

                     {/* UOM */}
                     <div className="px-4 py-3 w-28 border-e border-border/60 h-full flex items-center justify-center">
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.uomId`}
                                   render={({ field: inputField }) => {
                                          const uomCode = matchedItem?.primaryUom?.code || (inputField.value && inputField.value.length === 36 ? '...' : (inputField.value || 'PCS'));
                                          return (
                                                 <FormItem className="space-y-0 w-full">
                                                        <FormControl>
                                                               <div className="h-10 w-full flex items-center justify-center px-2 bg-background border border-border text-foreground rounded-xl font-mono uppercase text-[11px] font-bold">
                                                                      {uomCode}
                                                               </div>
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-1" />
                                                 </FormItem>
                                          );
                                   }}
                            />
                     </div>

                     {/* Unit Price */}
                     <div className="px-4 py-3 w-36 text-center border-e border-border/60 h-full flex items-center justify-center">
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.unitPrice`}
                                   render={({ field: inputField }) => (
                                          <FormItem className="space-y-0 w-full">
                                                 <FormControl>
                                                        <Input
                                                               {...inputField}
                                                               type="text"
                                                               inputMode="decimal"
                                                               disabled={isLocked}
                                                               className="bg-background border border-border text-foreground font-mono h-10 rounded-xl text-xs font-bold text-center transition-all focus:ring-2 focus:ring-cyan-500/20"
                                                               dir="ltr"
                                                               value={inputField.value === undefined || inputField.value === null || (typeof inputField.value === 'number' && Number.isNaN(inputField.value)) ? "" : inputField.value}
                                                               onChange={(e) => {
                                                                      let val = e.target.value.replace(/[^0-9.]/g, '');
                                                                      const parts = val.split('.');
                                                                      if (parts.length > 2) {
                                                                             val = parts[0] + '.' + parts.slice(1).join('');
                                                                      }
                                                                      inputField.onChange(val);
                                                               }}
                                                        />
                                                 </FormControl>
                                                 <FormMessage className="text-[10px] mt-1" />
                                          </FormItem>
                                   )}
                            />
                     </div>

                     {/* Notes */}
                     <div className="px-6 py-3 flex-[2] border-e border-border/60 h-full flex items-center min-w-[200px]">
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.notes`}
                                   render={({ field: inputField }) => (
                                          <FormItem className="space-y-0 w-full">
                                                 <FormControl>
                                                        <Input
                                                               placeholder={t('notes_placeholder')}
                                                               disabled={isLocked}
                                                               className="bg-background border border-border text-foreground h-10 rounded-xl text-xs font-medium transition-all focus:ring-2 focus:ring-cyan-500/20"
                                                               {...inputField}
                                                        />
                                                 </FormControl>
                                                 <FormMessage className="text-[10px] mt-1" />
                                          </FormItem>
                                   )}
                            />
                     </div>

                     {/* Delete Button */}
                     {!isLocked && (
                            <div className="px-6 py-3 w-16 text-center h-full flex items-center justify-center">
                                   <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9 transition-all rounded-xl"
                                          onClick={() => remove(index)}
                                   >
                                          <Trash2 className="h-4 w-4" />
                                   </Button>
                            </div>
                     )}
              </div>
       );
}
