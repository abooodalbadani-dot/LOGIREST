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
                     <div className="hidden md:block w-full rounded-2xl bg-white dark:bg-[#0B1220] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
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
                                          <div className="sticky top-0 z-20 bg-gray-50/90 dark:bg-[#1A2234]/90 backdrop-blur-xl shadow-sm flex border-b border-gray-200 dark:border-gray-800 min-w-[1000px] h-14 start-0 w-full">
                                                 <div className="px-6 py-4 text-label-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex-[3] text-start border-e border-gray-200 dark:border-gray-800 min-w-[300px]">{tc('table_headers.item')}</div>
                                                 <div className="px-4 py-4 text-label-xs font-bold uppercase text-gray-500 dark:text-gray-400 text-center w-28 border-e border-gray-200 dark:border-gray-800">{t('quantity')}</div>
                                                 <div className="px-4 py-4 text-label-xs font-bold uppercase text-gray-500 dark:text-gray-400 text-center w-28 border-e border-gray-200 dark:border-gray-800">{tc('uom.label')}</div>
                                                 <div className="px-4 py-4 text-label-xs font-bold uppercase text-gray-500 dark:text-gray-400 text-center w-36 border-e border-gray-200 dark:border-gray-800">{t('unit_price')} {currency ? `(${currency})` : ''}</div>
                                                 <div className="px-6 py-4 text-label-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex-[2] text-start border-e border-gray-200 dark:border-gray-800 min-w-[200px]">{tc('table_headers.notes') || t('line_notes')}</div>
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
       currency,
       fieldsCount,
}: LineItemCardProps) {
       const rowValues = useWatch({
              control: form.control,
              name: `lines.${index}`,
       });

       const matchedItem = itemsData?.data?.find((i) => i.id === rowValues?.itemId);

       return (
              <div className="bg-white dark:bg-[#0B1220] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                     {/* Header */}
                     <div className="flex justify-between items-center bg-[#0B1220] px-4 py-2 border-b border-gray-800">
                            <div className="flex flex-col">
                                   <span className="text-sm font-bold text-white">{rowValues?.itemName || tc('select_item')}</span>
                                   <span className="text-[10px] text-[#D4AF37] font-mono tracking-widest mt-0.5">{rowValues?.itemCode || '---'}</span>
                            </div>
                            {!isLocked && (
                                   <button 
                                          type="button" 
                                          className="text-red-400 hover:text-red-300 transition-colors p-2 -mr-2" 
                                          onClick={() => remove(index)}
                                   >
                                          <Trash2 className="w-4 h-4" />
                                   </button>
                            )}
                     </div>

                     {/* Body */}
                     <div className="grid grid-cols-3 gap-3 p-3 bg-white dark:bg-[#0B1220]">
                            {/* Quantity */}
                            <div className="flex flex-col col-span-1">
                                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">
                                          {t('quantity')}
                                   </label>
                                   <FormField
                                          control={form.control}
                                          name={`lines.${index}.quantity`}
                                          render={({ field: inputField }) => (
                                                 <FormItem className="space-y-0 w-full">
                                                        <FormControl>
                                                               <input
                                                                      type="number"
                                                                      min="1"
                                                                      disabled={isLocked}
                                                                      className="h-8 w-full text-center text-sm font-bold text-[#0B1220] dark:text-white bg-gray-50 dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                                                                      dir="ltr"
                                                                      value={inputField.value || ''}
                                                                      onChange={(e) => inputField.onChange(e.target.value ? Number(e.target.value) : '')}
                                                               />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-1" />
                                                 </FormItem>
                                          )}
                                   />
                            </div>

                            {/* UOM */}
                            <div className="flex flex-col col-span-1">
                                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">
                                          {tc('uom.label')}
                                   </label>
                                   <FormField
                                          control={form.control}
                                          name={`lines.${index}.uomId`}
                                          render={({ field: inputField }) => {
                                                 const uomCode = matchedItem?.primaryUom?.code || (inputField.value && inputField.value.length === 36 ? '...' : (inputField.value || 'PCS'));
                                                 return (
                                                        <FormItem className="space-y-0 w-full">
                                                               <FormControl>
                                                                      <div className="h-8 w-full flex items-center justify-center bg-gray-50 dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white rounded font-mono uppercase text-[11px] font-bold">
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
                            <div className="flex flex-col col-span-1">
                                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">
                                          {t('unit_price')} {currency ? `(${currency})` : ''}
                                   </label>
                                   <FormField
                                          control={form.control}
                                          name={`lines.${index}.unitPrice`}
                                          render={({ field: inputField }) => (
                                                 <FormItem className="space-y-0 w-full">
                                                        <FormControl>
                                                               <input
                                                                      type="number"
                                                                      step="0.01"
                                                                      min="0"
                                                                      disabled={isLocked}
                                                                      className="h-8 w-full text-center text-sm font-bold text-[#0B1220] dark:text-white bg-gray-50 dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                                                                      dir="ltr"
                                                                      value={inputField.value !== undefined ? inputField.value : ''}
                                                                      onChange={(e) => inputField.onChange(e.target.value ? Number(e.target.value) : '')}
                                                               />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-1" />
                                                 </FormItem>
                                          )}
                                   />
                            </div>

                            {/* Notes */}
                            <div className="flex flex-col col-span-3 pt-1 border-t border-gray-50 dark:border-gray-800 mt-1">
                                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 truncate">
                                          {tc('table_headers.notes') || t('line_notes')}
                                   </label>
                                   <FormField
                                          control={form.control}
                                          name={`lines.${index}.notes`}
                                          render={({ field: inputField }) => (
                                                 <FormItem className="space-y-0 w-full">
                                                        <FormControl>
                                                               <input
                                                                      placeholder={t('notes_placeholder')}
                                                                      disabled={isLocked}
                                                                      className="h-8 w-full px-3 text-xs font-medium text-[#0B1220] dark:text-white bg-gray-50 dark:bg-[#1A2234] border border-gray-200 dark:border-gray-700 rounded focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                                                                      value={inputField.value || ''}
                                                                      onChange={(e) => inputField.onChange(e.target.value)}
                                                               />
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-1" />
                                                 </FormItem>
                                          )}
                                   />
                            </div>
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
       fieldsCount,
}: LineItemRowProps) {
       const rowValues = useWatch({
              control: form.control,
              name: `lines.${index}`,
       });

       return (
              <div
                     data-index={index}
                     className="absolute top-0 start-0 w-full min-w-[1000px] border-b border-gray-200 dark:border-gray-800 transition-all hover:bg-gray-50/50 dark:hover:bg-[#161F30]/50 flex items-center h-[80px] group"
                     style={{
                            transform: `translateY(${virtualRow.start + 56}px)`, // Offset by header height
                     }}
              >
                     <div className="px-6 py-3 flex-[3] border-e border-gray-200 dark:border-gray-800 h-full flex items-center min-w-[300px]">
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
                                                               className="h-11 w-full bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white rounded-md text-sm font-bold uppercase transition-all shadow-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                                               triggerClassName="h-11 bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white rounded-md text-sm font-bold uppercase shadow-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                                                               disabled={isLocked}
                                                        />
                                                 </FormControl>
                                                 <FormMessage className="text-[10px] mt-1" />
                                          </FormItem>
                                   )}
                            />
                     </div>

                     <div className="px-4 py-3 w-28 text-center border-e border-gray-200 dark:border-gray-800 h-full flex items-center justify-center">
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
                                                               className="bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white font-mono h-11 rounded-md text-sm font-bold text-center transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
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

                     <div className="px-4 py-3 w-28 border-e border-gray-200 dark:border-gray-800 h-full flex items-center justify-center">
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.uomId`}
                                   render={({ field: inputField }) => {
                                          const matchedItem = itemsData?.data?.find((i) => i.id === rowValues?.itemId);
                                          const uomCode = matchedItem?.primaryUom?.code || (inputField.value && inputField.value.length === 36 ? '...' : (inputField.value || 'PCS'));
                                          return (
                                                 <FormItem className="space-y-0 w-full">
                                                        <FormControl>
                                                               <div className="h-11 w-full flex items-center justify-center px-2 bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white rounded-md font-mono uppercase text-[11px] font-bold">
                                                                      {uomCode}
                                                               </div>
                                                        </FormControl>
                                                        <FormMessage className="text-[10px] mt-1" />
                                                 </FormItem>
                                          );
                                   }}
                            />
                     </div>

                     <div className="px-4 py-3 w-36 text-center border-e border-gray-200 dark:border-gray-800 h-full flex items-center justify-center">
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
                                                               className="bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white font-mono h-11 rounded-md text-sm font-bold text-center transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
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

                     <div className="px-6 py-3 flex-[2] border-e border-gray-200 dark:border-gray-800 h-full flex items-center min-w-[200px]">
                            <FormField
                                   control={form.control}
                                   name={`lines.${index}.notes`}
                                   render={({ field: inputField }) => (
                                          <FormItem className="space-y-0 w-full">
                                                 <FormControl>
                                                        <Input
                                                               placeholder={t('notes_placeholder')}
                                                               disabled={isLocked}
                                                               className="bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-700 text-[#0B1220] dark:text-white h-11 rounded-md text-sm font-medium transition-all focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
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
                                          className="text-gray-400 hover:text-status-error hover:bg-status-error/10 h-10 w-10 transition-all rounded-md"
                                          onClick={() => remove(index)}
                                   >
                                          <Trash2 className="h-4 w-4" />
                                   </Button>
                            </div>
                     )}
              </div>
       );
}
