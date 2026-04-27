"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LockBanner } from "@/components/ui/lock-banner";
import { FEFOLotAllocator } from "@/components/ui/fefo-lot-allocator";
import { PostConfirmDialog } from "@/components/ui/post-confirm-dialog";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { useCreateIssue } from "@/features/operations/api/useIssues";
import { IssueLot } from "@/features/operations/types";
import { ArrowLeft, ArrowRight, Plus, PackageCheck, Trash2 } from "lucide-react";

const lineSchema = z.object({
  itemId: z.string().min(1, "اسم الصنف مطلوب"),
  requestedQuantity: z.number({ message: "الكمية مطلوبة" }).min(0.01, "يجب أن تكون الكمية موجبة"),
  allocatedQuantity: z.number(),
  lots: z.array(z.custom<IssueLot>()),
  notes: z.string().optional(),
});

const formSchema = z.object({
  warehouseId: z.string().min(1, "المخزن مطلوب"),
  departmentId: z.string().min(1, "القسم مطلوب"),
  items: z.array(lineSchema).min(1, "يجب إضافة صنف واحد على الأقل"),
  notes: z.string().optional(),
});

type IssueFormValues = z.infer<typeof formSchema>;

// Simulated locked warehouse IDs for demo
const LOCKED_WAREHOUSES = new Set(["wh-locked-01"]);

export function IssueForm({ locale }: { locale: string }) {
  const router = useRouter();
  const createIssue = useCreateIssue();

  const [allocatorOpen, setAllocatorOpen] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouseId: "",
      departmentId: "",
      items: [],
      notes: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedWarehouse = form.watch("warehouseId");
  const isWarehouseLocked = LOCKED_WAREHOUSES.has(watchedWarehouse);

  const handleOpenAllocator = (index: number) => {
    setActiveLineIndex(index);
    setAllocatorOpen(true);
  };

  const handleAllocate = (lots: IssueLot[]) => {
    if (activeLineIndex === null) return;
    const line = fields[activeLineIndex];
    const allocated = lots.reduce((s, l) => s + l.allocatedQuantity, 0);
    update(activeLineIndex, {
      ...line,
      allocatedQuantity: allocated,
      lots,
    });
  };

  const allLinesAllocated = fields.length > 0 && fields.every(
    (f) => (f.allocatedQuantity ?? 0) >= (f.requestedQuantity ?? 0)
  );

  const onSubmit = (data: IssueFormValues) => {
    if (!allLinesAllocated) return;
    createIssue.mutate(data, {
      onSuccess: (issue) => {
        router.push(`/${locale}/issues/${issue.id}`);
      },
      onError: () => console.error("Failed to create issue"),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 rtl:hidden" />
          <ArrowRight className="h-5 w-5 hidden rtl:block" />
        </Button>
        <Breadcrumb
          items={[
            { label: "العمليات", href: `/${locale}` },
            { label: "صرف المخزون", href: `/${locale}/issues` },
            { label: "صرف جديد", href: "#" },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <PackageCheck className="w-8 h-8 text-brand-primary" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">صرف جديد</h2>
          <p className="text-muted-foreground mt-1">صرف المواد من المستودع وتخصيص الدُّفعات وفق مبدأ FEFO.</p>
        </div>
      </div>

      {isWarehouseLocked && <LockBanner message="المستودع المختار مقفل بسبب جرد نشط. لا يمكن الصرف حتى انتهاء الجرد." />}

      <form onSubmit={form.handleSubmit(() => setConfirmOpen(true))} className="space-y-6">
        {/* Header fields */}
        <Card>
          <CardHeader>
            <CardTitle>بيانات الصرف</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="warehouseId">المخزن *</Label>
              <Input id="warehouseId" {...form.register("warehouseId")}
                className={form.formState.errors.warehouseId ? "border-red-500" : ""} />
              {form.formState.errors.warehouseId && (
                <p className="text-sm text-red-500">{form.formState.errors.warehouseId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentId">القسم *</Label>
              <Input id="departmentId" {...form.register("departmentId")}
                className={form.formState.errors.departmentId ? "border-red-500" : ""} />
              {form.formState.errors.departmentId && (
                <p className="text-sm text-red-500">{form.formState.errors.departmentId.message}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Input id="notes" {...form.register("notes")} />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>الأصناف</CardTitle>
                <CardDescription>أضف الأصناف المطلوب صرفها وخصِّص الدُّفعات.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ itemId: "", requestedQuantity: 1, allocatedQuantity: 0, lots: [] })}
              >
                <Plus className="mr-1 w-4 h-4" />
                إضافة صنف
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.formState.errors.items?.root && (
              <p className="text-sm text-red-500">{form.formState.errors.items.root.message}</p>
            )}
            {fields.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground bg-surface-2/30 rounded-lg border border-dashed border-surface-2">
                <p>لم تتم إضافة أي صنف. اضغط «إضافة صنف» للبدء.</p>
              </div>
            ) : (
              fields.map((field, index) => {
                const isAllocated = (field.allocatedQuantity ?? 0) >= (field.requestedQuantity ?? 0);
                return (
                  <div key={field.id} className={`grid grid-cols-12 gap-3 items-center p-4 rounded-lg border ${isAllocated ? "border-brand-primary/30 bg-brand-primary/5" : "border-surface-2 bg-surface-1"}`}>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs text-text-tertiary">رمز الصنف</Label>
                      <Input
                        placeholder="item-tomato"
                        {...form.register(`items.${index}.itemId`)}
                        className={form.formState.errors.items?.[index]?.itemId ? "border-red-500" : ""}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-text-tertiary">الكمية</Label>
                      <Input
                        type="number" min="0.01" step="0.01" dir="ltr"
                        {...form.register(`items.${index}.requestedQuantity`, { valueAsNumber: true })}
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2 space-y-1 text-center">
                      <Label className="text-xs text-text-tertiary">مُخصَّص</Label>
                      <p className={`text-lg font-bold ${isAllocated ? "text-brand-primary" : "text-amber-500"}`} dir="ltr">
                        {field.allocatedQuantity || 0}
                      </p>
                    </div>
                    <div className="col-span-3 flex items-end gap-2 pb-0.5">
                      <Button
                        type="button"
                        variant={isAllocated ? "outline" : "default"}
                        size="sm"
                        className={isAllocated ? "border-brand-primary text-brand-primary" : ""}
                        onClick={() => handleOpenAllocator(index)}
                        disabled={!field.itemId}
                      >
                        {isAllocated ? "✓ تعديل الدُّفعات" : "تخصيص الدُّفعات"}
                      </Button>
                    </div>
                    <div className="col-span-1 flex items-end justify-end pb-0.5">
                      <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => remove(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={createIssue.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            className="bg-brand-primary hover:bg-brand-primary/90 text-white"
            disabled={createIssue.isPending || isWarehouseLocked || !allLinesAllocated || fields.length === 0}
          >
            {createIssue.isPending ? "جار الحفظ..." : "إنشاء الصرف"}
          </Button>
        </div>
      </form>

      {/* FEFO Allocator Drawer */}
      {activeLineIndex !== null && (
        <FEFOLotAllocator
          isOpen={allocatorOpen}
          onClose={() => setAllocatorOpen(false)}
          itemId={fields[activeLineIndex].itemId}
          requestedQty={fields[activeLineIndex].requestedQuantity || 1}
          onAllocate={handleAllocate}
        />
      )}

      <PostConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          form.handleSubmit(onSubmit)();
        }}
        title="تأكيد إنشاء الصرف؟"
        description="سيتم إنشاء أمر الصرف وحجز الدُّفعات المخصَّصة. يمكنك الترحيل لاحقاً من صفحة التفاصيل."
        confirmText="إنشاء"
      />
    </div>
  );
}
