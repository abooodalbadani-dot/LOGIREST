"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LockBanner } from "@/components/ui/lock-banner";
import { ArrowRight, Save, Receipt, Search } from "lucide-react";
import { useCreateGoodsReceipt } from "@/features/purchasing/api/useGoodsReceipts";
import { usePurchaseOrder } from "@/features/purchasing/api/usePurchaseOrders";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

const grnItemSchema = z.object({
  poLineItemId: z.string().min(1, "Required"),
  itemId: z.string().min(1, "Required"),
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

export function GRNForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poIdParam = searchParams.get("po");

  // Temporary mock: hardcoded locked warehouse check
  const isTargetWarehouseLocked = false; 

  const { data: poDetails, isLoading: isPoLoading } = usePurchaseOrder(poIdParam || "");

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

  const { fields, remove } = useFieldArray({
    name: "items",
    control: form.control,
  });

  const createGRN = useCreateGoodsReceipt();

  // Auto-populate from PO
  useEffect(() => {
    if (poDetails) {
      form.setValue("supplierId", poDetails.supplierId);
      // Populate items based on PO lines
      const poItems = poDetails.items.map((pi) => ({
        poLineItemId: pi.id || `temp-${Math.random()}`,
        itemId: pi.itemId,
        orderedQuantity: pi.quantity,
        receivedQuantity: pi.quantity, // Default to receiving full quantity
        lotNumber: "",
        expiryDate: "",
        notes: "",
      }));
      form.setValue("items", poItems);
    }
  }, [poDetails, form]);

  const onSubmit = (data: GRNFormValues) => {
    // Validate that receivedQuantity <= orderedQuantity 
    // Actually, in many ERPs partial is OK, over-receipt might be restricted but let's allow it for basic mock or just skip rigid checks
    createGRN.mutate(data, {
      onSuccess: () => {
        router.push("/purchasing/grn");
      },
      onError: () => {
        console.error("Failed to create GRN");
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowRight className="h-5 w-5 rtl:hidden" />
            <ArrowRight className="h-5 w-5 hidden rtl:block rotate-180" />
          </Button>
          <Breadcrumb 
            items={[
              { label: "Purchasing", href: "/purchasing" },
              { label: "Goods Receipts", href: "/purchasing/grn" },
              { label: "Receive Goods", href: "#" },
            ]} 
          />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="w-8 h-8 text-brand-primary" />
          Receive Goods
        </h2>
        <p className="text-muted-foreground mt-2">
          Record incoming items against a Purchase Order and assign lots/expiry dates.
        </p>
      </div>

      {isTargetWarehouseLocked && (
        <LockBanner 
          message="The selected warehouse is currently locked for a stocktake. Receiving goods is temporarily disabled."
        />
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Details</CardTitle>
            <CardDescription>Link this GRN to an approved Purchase Order.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="poId">Purchase Order</Label>
              <div className="flex gap-2">
                <Input
                  id="poId"
                  placeholder="Enter PO Number or ID..."
                  {...form.register("poId")}
                  className={form.formState.errors.poId ? "border-neon-error" : ""}
                />
                <Button type="button" variant="outline" size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {form.formState.errors.poId && (
                <p className="text-sm text-neon-error">{form.formState.errors.poId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Receiving Warehouse ID</Label>
              <Input
                id="warehouseId"
                {...form.register("warehouseId")}
                className={form.formState.errors.warehouseId ? "border-neon-error" : ""}
              />
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-neon-error">{form.formState.errors.warehouseId.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier ID</Label>
              <Input
                id="supplierId"
                readOnly
                className="bg-surface-2 opacity-70"
                {...form.register("supplierId")}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                {...form.register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Received Items</CardTitle>
                <CardDescription>Specify received quantities, lot numbers, and expiry dates.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
             {form.formState.errors.items?.root && (
              <p className="text-sm text-neon-error mb-4">{form.formState.errors.items.root.message}</p>
            )}
            
            {fields.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-surface-2/30 rounded-lg border border-dashed border-surface-2">
                <Receipt className="w-12 h-12 mx-auto opacity-20 mb-3" />
                <p>No items found. Please select a valid Purchase Order.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-text-secondary pb-2 border-b border-surface-2 hidden md:grid">
                  <div className="col-span-2">Item ID</div>
                  <div className="col-span-2 text-center">Ordered Qty</div>
                  <div className="col-span-2 text-center">Received Qty</div>
                  <div className="col-span-3">Lot Number</div>
                  <div className="col-span-2">Expiry Date</div>
                  <div className="col-span-1"></div>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 md:p-0 border border-surface-2 md:border-none rounded-lg bg-surface-1 md:bg-transparent">
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-text-tertiary mb-1 block">Item ID</Label>
                      <Input
                        readOnly
                        className="bg-surface-2 opacity-70"
                        {...form.register(`items.${index}.itemId`)}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-text-tertiary mb-1 block">Ordered Qty</Label>
                      <Input
                        type="number"
                        readOnly
                        className="bg-surface-2 opacity-70 text-center"
                        {...form.register(`items.${index}.orderedQuantity`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-text-tertiary mb-1 block text-brand-primary">Received Qty</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        className={`text-center font-bold ${form.formState.errors.items?.[index]?.receivedQuantity ? "border-neon-error" : "border-brand-primary/50 bg-brand-primary/5"}`}
                        {...form.register(`items.${index}.receivedQuantity`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <Label className="md:hidden text-xs text-text-tertiary mb-1 block">Lot Number</Label>
                      <Input
                        placeholder="e.g. LOT-1234"
                        className={form.formState.errors.items?.[index]?.lotNumber ? "border-neon-error" : ""}
                        {...form.register(`items.${index}.lotNumber`)}
                      />
                      {form.formState.errors.items?.[index]?.lotNumber && (
                        <p className="text-xs text-neon-error mt-1">{form.formState.errors.items[index]?.lotNumber?.message}</p>
                      )}
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label className="md:hidden text-xs text-text-tertiary mb-1 block">Expiry Date</Label>
                      <Input
                        type="date"
                        className={form.formState.errors.items?.[index]?.expiryDate ? "border-neon-error" : ""}
                        {...form.register(`items.${index}.expiryDate`)}
                      />
                      {form.formState.errors.items?.[index]?.expiryDate && (
                        <p className="text-xs text-neon-error mt-1">{form.formState.errors.items[index]?.expiryDate?.message}</p>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="text-neon-error hover:bg-neon-error/10 hover:text-neon-error"
                        onClick={() => remove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={createGRN.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            disabled={createGRN.isPending || isTargetWarehouseLocked || fields.length === 0}
          >
            {createGRN.isPending ? "Creating..." : "Save Draft GRN"}
            {!createGRN.isPending && <Save className="ml-2 w-4 h-4 rtl:mr-2 rtl:ml-0" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
