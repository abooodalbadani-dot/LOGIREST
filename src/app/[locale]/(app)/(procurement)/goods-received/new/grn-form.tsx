"use client";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LockBanner } from "@/components/ui/lock-banner";
import { Save, Receipt, Search, Plus, Trash2, ArrowRight, Package, Box, ShieldCheck, History } from "lucide-react";
import { useCreateGoodsReceipt } from "@/features/purchasing/api/useGoodsReceipts";
import { usePurchaseOrder } from "@/features/purchasing/api/usePurchaseOrders";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { PageHeader } from "@/components/shared/PageHeader";
import { Separator } from "@/components/ui/separator";
import { useMasterDataList, useMasterDataItem } from "@/features/master-data/hooks/useMasterDataCRUD";
import { WarehouseSchema, SupplierSchema } from "@/types/master-data";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";

const grnItemSchema = z.object({
 poLineItemId: z.string().min(1, "Required"),
 itemId: z.string().min(1, "Required"),
 itemName: z.string().optional(),
 orderedQuantity: z.number().min(0.01, "Invalid"),
 receivedQuantity: z.number().min(0, "Invalid"),
 lotNumber: z.string().min(1, "Lot number is required"),
 expiryDate: z.string().min(1, "Expiry date is required"),
 notes: z.string().optional(),
});

const formSchema = z.object({
 poId: z.string().min(1, "Reference PO is required"),
 warehouseId: z.string().min(1, "Receiving warehouse is required"),
 supplierId: z.string().min(1, "Supplier is required"),
 items: z.array(grnItemSchema).min(1, "At least one item is required"),
 notes: z.string().optional(),
});

type GRNFormValues = z.infer<typeof formSchema>;

export function GRNForm({ locale }: { locale: 'ar' | 'en' }) {
 const t = useTranslations('procurement.grn');
 const tc = useTranslations('common');
 const router = useRouter();
 const searchParams = useSearchParams();
 const poIdParam = searchParams.get("po");

 const form = useForm<GRNFormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 poId: poIdParam || "",
 warehouseId: "",
 supplierId: "",
 items: [],
 notes: "",
 },
 });

 const selectedWarehouseId = useWatch({
 control: form.control,
 name: "warehouseId",
 });
 const { data: lockState } = useWarehouseLock(selectedWarehouseId || null);
 const isTargetWarehouseLocked = !!lockState?.isLocked;

 const { data: poDetails, isLoading: isPoLoading } = usePurchaseOrder(poIdParam || "");
 const { data: warehouses } = useMasterDataList('warehouses', WarehouseSchema);


 const watchedSupplierId = useWatch({
 control: form.control,
 name: "supplierId",
 });
 const { data: supplier } = useMasterDataItem('suppliers', watchedSupplierId || null, SupplierSchema);

 const { fields, remove } = useFieldArray({
 name: "items",
 control: form.control,
 });

 const createGRN = useCreateGoodsReceipt();

 useEffect(() => {
 if (poDetails) {
 form.setValue("supplierId", poDetails.supplier_id);
 const poItems = poDetails.lines.map((pi) => ({
 poLineItemId: pi.id || `temp- ${Math.random()}`,
 itemId: pi.item.id,
 itemName: locale === 'ar' ? pi.item.name_ar : pi.item.name_en,
 orderedQuantity: pi.quantity,
 receivedQuantity: pi.quantity,
 lotNumber: "",
 expiryDate: "",
 notes: "",
 }));
 form.setValue("items", poItems);
 }
 }, [poDetails, form, locale]);

 const onSubmit = (data: GRNFormValues) => {
 createGRN.mutate(data, {
 onSuccess: () => {
 router.push(`/${locale}/goods-received`);
 },
 });
 };

 return (
 <div className="p-10 max-w-[1600px] mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
 <Breadcrumb 
 items={[
 { label: tc('sidebar.dashboard'), href: `/${locale}` },
 { label: tc('sidebar.grn'), href: `/${locale}/goods-received` },
 { label: t('create_new') }
 ]} 
 />

 <PageHeader
 title={t('title')}
 description={t('new_manifest_sub')}
 actions={
 <div className="flex items-center gap-6">
 <Button 
 variant="outline"
 onClick={() => router.back()}
 className="h-12 px-10 text-label-xs font-semibold uppercase rounded-sm transition-all border-white/5 hover:bg-white/5"
 >
 {tc('cancel')}
 </Button>
 <Button 
 onClick={form.handleSubmit(onSubmit)}
 disabled={createGRN.isPending || isTargetWarehouseLocked || fields.length === 0}
 className="h-12 px-10 bg-cyan-500 hover:bg-cyan-400 text-black text-label-xs font-semibold uppercase rounded-sm transition-all shadow-[0_0_25px_rgba(6,182,212,0.25)] border-none"
 >
 {createGRN.isPending ? tc('saving') : t('save_draft')}
 {!createGRN.isPending && <Save className="ms-2 w-4 h-4" />}
 </Button>
 </div>
 }
 />

 {isTargetWarehouseLocked && (
 <LockBanner message={t('warehouse_locked')} />
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
 <div className="lg:col-span-2 space-y-10">
 <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden shadow-2xl">
 <CardHeader className="pb-8 border-b border-white/5 bg-surface-container-medium/30">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-cyan-500/10 rounded-sm">
 <Receipt className="w-5 h-5 text-cyan-400" />
 </div>
 <div>
 <CardTitle className="text-label-xs font-semibold uppercase text-foreground">{t('document_specification')}</CardTitle>
 <CardDescription className="text-label-xxs font-bold uppercase text-muted-foreground/40">{t('detail_sub')}</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-10 space-y-10">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="flex flex-col gap-3">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ps-1">{t('order_reference')}</Label>
 <div className="relative group">
 <Input
 id="poId"
 placeholder={t('scan_placeholder')}
 {...form.register("poId")}
 className="h-14 bg-surface-container-highest/20 border-white/5 font-mono uppercase text-cyan-500 text-label-sm focus:ring-cyan-500/20"
 />
 <Search className="absolute end-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/20 group-focus-within:text-cyan-500 transition-colors" />
 </div>
 {form.formState.errors.poId && <p className="text-label-xxs text-red-400 font-bold uppercase ps-1">{form.formState.errors.poId.message}</p>}
 </div>

 <div className="flex flex-col gap-3">
 <Label htmlFor="warehouseId" className="text-label-xs font-semibold uppercase text-muted-foreground/40 ps-1">{t('receiving_warehouse')}</Label>
 <select
 id="warehouseId"
 {...form.register("warehouseId")}
 className="h-14 bg-surface-container-highest/20 border-white/5 text-label-sm font-bold focus:ring-cyan-500/20 rounded-sm px-4 appearance-none hover:bg-white/[0.02] transition-all outline-none"
 >
 <option value="" className="bg-surface-container-low text-muted-foreground">{t('select_warehouse')}</option>
 {warehouses?.data?.map((wh) => (
 <option key={wh.id} value={wh.id} className="bg-surface-container-low">
 {locale === 'ar' ? wh.name_ar : wh.name_en}
 </option>
 ))}
 </select>
 {form.formState.errors.warehouseId && <p className="text-label-xxs text-red-400 font-bold uppercase ps-1">{form.formState.errors.warehouseId.message}</p>}
 </div>
 </div>

 <div className="flex flex-col gap-3">
 <Label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ps-1">{tc('notes')}</Label>
 <Input
 id="notes"
 placeholder={t('notes_placeholder') || tc('notes')}
 {...form.register("notes")}
 className="h-14 bg-surface-container-highest/20 border-white/5 text-label-sm font-bold focus:ring-cyan-500/20"
 />
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden shadow-2xl">
 <CardHeader className="pb-8 border-b border-white/5 bg-surface-container-medium/30">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-amber-500/10 rounded-sm">
 <Box className="w-5 h-5 text-amber-400" />
 </div>
 <div>
 <CardTitle className="text-label-xs font-semibold uppercase text-foreground">{tc('line_items') || 'Line Items'}</CardTitle>
 <CardDescription className="text-label-xxs font-bold uppercase text-muted-foreground/40">{t('received_manifest_sub')}</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {fields.length === 0 ? (
 <div className="p-20 text-center space-y-4 bg-surface-container-highest/5">
 <Package className="w-12 h-12 mx-auto opacity-10" />
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/20">{t('no_items') || 'No items linked to reference'}</p>
 </div>
 ) : (
 <div className="divide-y divide-white/5">
 <div className="grid grid-cols-12 gap-6 px-10 py-4 bg-surface-container-highest/10 text-label-xxs font-semibold uppercase text-muted-foreground/40">
 <div className="col-span-4">{tc('item')}</div>
 <div className="col-span-2 text-center">{tc('table_headers.qty')}</div>
 <div className="col-span-2 text-center">{t('receiving_qty')}</div>
 <div className="col-span-3">{tc('lot')} / {tc('expiry')}</div>
 <div className="col-span-1"></div>
 </div>

 {fields.map((field, index) => (
 <div key={field.id} className="grid grid-cols-12 gap-6 px-10 py-8 items-start group hover:bg-white/[0.01] transition-all">
 <div className="col-span-4 space-y-1.5">
 <div className="text-label-sm font-semibold text-foreground/80">{field.itemName}</div>
 <div className="font-mono text-label-xs text-cyan-500/50 uppercase">{field.itemId}</div>
 </div>

 <div className="col-span-2 flex flex-col items-center justify-center h-12 bg-surface-container-highest/10 rounded-sm border border-white/5">
 <span className="text-label-sm font-mono font-semibold">{field.orderedQuantity}</span>
 <span className="text-label-xxs font-semibold opacity-20 uppercase">{tc('ordered')}</span>
 </div>

 <div className="col-span-2">
 <Input
 type="number"
 step="0.01"
 aria-label={t('receiving_qty')}
 className="h-12 bg-cyan-500/5 border-cyan-500/20 text-center font-mono font-semibold text-cyan-400 focus:ring-cyan-500/20"
 {...form.register(`items.${index}.receivedQuantity`, { valueAsNumber: true })}
 />
 </div>

 <div className="col-span-3 space-y-3">
 <Input
 placeholder={tc('lot')}
 aria-label={tc('lot')}
 className="h-10 bg-surface-container-highest/20 border-white/5 text-label-xs font-semibold uppercase"
 {...form.register(`items.${index}.lotNumber`)}
 />
 <Input
 type="date"
 aria-label={tc('expiry')}
 className="h-10 bg-surface-container-highest/20 border-white/5 text-label-xs font-semibold uppercase"
 {...form.register(`items.${index}.expiryDate`)}
 />
 </div>

 <div className="col-span-1 flex justify-end pt-1">
 <Button 
 type="button" 
 variant="ghost" 
 size="icon"
 className="h-10 w-10 text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
 onClick={() => remove(index)}
 >
 <Trash2 className="w-4 h-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 <div className="space-y-10">
 <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden shadow-2xl">
 <CardHeader className="pb-8 border-b border-white/5 bg-surface-container-medium/30">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-emerald-500/10 rounded-sm">
 <ShieldCheck className="w-5 h-5 text-emerald-400" />
 </div>
 <div>
 <CardTitle className="text-label-xs font-semibold uppercase text-foreground">{t('status_context')}</CardTitle>
 <CardDescription className="text-label-xxs font-bold uppercase text-muted-foreground/40">{t('operational_status')}</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 <div className="flex items-center justify-between p-6 bg-surface-container-highest/10 rounded-sm border border-white/5">
 <div className="space-y-1">
 <div className="text-label-xs font-semibold uppercase text-muted-foreground/60">{tc('status_label')}</div>
 <div className="text-label-sm font-semibold uppercase text-amber-400">{tc('status.draft')}</div>
 </div>
 <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
 </div>

 <div className="p-6 bg-surface-container-highest/10 rounded-sm border border-white/5 space-y-4">
 <div className="text-label-xs font-semibold uppercase text-muted-foreground/60">{t('partner_identity') || 'Partner Identity'}</div>
 <div className="space-y-1">
 <div className="text-label-sm font-semibold uppercase text-foreground/80">
 {supplier ? (locale === 'ar' ? supplier.name_ar : supplier.name_en) : watchedSupplierId || tc('not_available')}
 </div>
 <div className="text-label-xxs font-bold uppercase text-muted-foreground/30">{t('verified_vendor_sub')}</div>
 </div>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface-container-low border-none rounded-sm overflow-hidden shadow-2xl">
 <CardHeader className="pb-8 border-b border-white/5 bg-surface-container-medium/30">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-indigo-500/10 rounded-sm">
 <History className="w-5 h-5 text-indigo-400" />
 </div>
 <div>
 <CardTitle className="text-label-xs font-semibold uppercase text-foreground">{t('ledger_history')}</CardTitle>
 <CardDescription className="text-label-xxs font-bold uppercase text-muted-foreground/40">{tc('audit_trail')}</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8">
 <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-sm bg-surface-container-highest/5">
 <p className="text-label-xxs font-semibold uppercase text-muted-foreground/20">{tc('no_records') || 'No Audit Records'}</p>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
