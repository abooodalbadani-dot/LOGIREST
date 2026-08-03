"use client";

import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { StickyGlassHeader } from "@/components/shared/StickyGlassHeader";
import { InlineLoader } from "@/components/shared/InlineLoader";
import { useCreateAdjustment } from "@/features/operations/hooks/useCreateAdjustment";
import { useApproveAdjustment } from "@/features/operations/hooks/useApproveAdjustment";
import { usePostAdjustment } from "@/features/operations/hooks/usePostAdjustment";
import { useSubmitAdjustment } from "@/features/operations/hooks/useSubmitAdjustment";
import { useRejectAdjustment } from "@/features/operations/hooks/useRejectAdjustment";
import { useUpdateAdjustment } from "@/features/operations/hooks/useUpdateAdjustment";
import { useCancelAdjustment } from "@/features/operations/hooks/useCancelAdjustment";
import { useEditAdjustment } from "@/features/operations/hooks/useEditAdjustment";
import { useAuth } from "@/providers/AuthProvider";
import { useWarehouseLock } from "@/hooks/useWarehouseLock";
import { useAbortController } from "@/hooks/useAbortController";
import {
  StatusTimeline,
  type Status,
} from "@/components/shared/StatusTimeline";
import {
  CheckCircle,
  Package,
  Send,
  XCircle,
  History,
  Info,
  Clock,
  AlertCircle,
  Pencil,
  X as XIcon,
  XCircle as XCircleIcon,
  CheckCircle as CheckCircleIcon,
  Warehouse,
  PackagePlus,
  CheckCircle2,
  Save,
  FileText,
  ArrowLeft,
  Scan,
  Trash2,
  Loader2,
} from "lucide-react";
import { ClientOnlyTime } from "@/components/shared/ClientOnlyTime";
import {
  DocumentLineItemTable,
  type LineItem,
} from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import type { LotAllocation } from "@/types/documents";
import { useLotsByItem } from "@/features/operations/hooks/useLotsByItem";
import { SmartCombobox } from "@/components/shared/SmartCombobox";
import { ScanInput } from "@/components/shared/ScanInput/ScanInput";
import { useItems } from "@/features/items/hooks/useItems";
import { useVarianceReasons } from "@/features/operations/api/useVarianceReasons";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { StatusBadge, type BadgeStatus } from "@/components/shared/StatusBadge";
import { DocumentExportMenu } from "@/components/shared/DocumentExportMenu";
import { ADJUSTMENT_STATUS, type DocumentStatus } from "@logirest/shared-types";
import {
  type AdjustmentLine,
  type AdjustmentDetail,
} from "@/features/operations/hooks/useAdjustment";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import {
  DocumentLockBanner,
  DocumentLockWrapper,
} from "@/components/shared/DocumentLockBanner";
import { FormFooter } from "@/components/layouts/FormLayout";
import { formatCurrency, formatDate } from "@/utils/currency";
import { resolveBarcodeAndUom } from "@/utils/barcode-resolver";
import { audioAlerts } from "@/utils/audio";
import { VoidButton } from "@/components/shared/VoidButton";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { getScaledQtyBefore, getAvailableUomsForItem, resolveUomCode } from "@/utils/uom-helper";

interface AdjustmentFormProps {
  document?: AdjustmentDetail;
  id: string;
  isLocked: boolean;
  onConflict?: () => void;
}

function UnitCostInput({
  value,
  onChange,
  disabled,
  placeholder,
  className,
}: {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState<string>(
    value !== null && value !== undefined ? String(value) : "",
  );

  useEffect(() => {
    const numVal = value !== null && value !== undefined ? Number(value) : null;
    const localNum = localValue !== "" ? Number(localValue) : null;
    if (numVal !== localNum) {
      setLocalValue(value !== null && value !== undefined ? String(value) : "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === "" || /^\d*\.?\d*$/.test(rawVal)) {
      setLocalValue(rawVal);
      if (rawVal === "" || rawVal === ".") {
        onChange(null);
      } else {
        const parsed = parseFloat(rawVal);
        onChange(isNaN(parsed) ? null : parsed);
      }
    }
  };

  const handleBlur = () => {
    if (localValue === "" || localValue === ".") {
      setLocalValue("0");
      onChange(0);
    } else {
      const parsed = parseFloat(localValue);
      if (isNaN(parsed)) {
        setLocalValue("0");
        onChange(0);
      } else {
        setLocalValue(String(parsed));
        onChange(parsed);
      }
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={localValue}
      lang="en"
      dir="ltr"
      style={{ direction: "ltr" }}
      disabled={disabled}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}

import { AdjustmentLotSelector } from "@/features/operations/components/AdjustmentLotSelector";

interface AdjustmentFormLine extends Omit<
  AdjustmentLine,
  "lot" | "lotAllocations"
> {
  qty: number;
  lotId?: string | null;
  lotNumber?: string | null;
  lot_number?: string | null;
  lot?: { id?: string; lotNumber: string; expiryDate: string | null } | null;
  lotAllocations?: (LotAllocation & { lotNumber?: string })[];
}

export function AdjustmentForm({
  document,
  id,
  isLocked,
  onConflict,
}: AdjustmentFormProps) {
  const t = useTranslations("operations.adjustment");
  const tc = useTranslations("common");
  const tp = useTranslations("print");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();

  const isNew = id === "new";
  const adjustmentStatus =
    (document?.status as DocumentStatus) ?? ADJUSTMENT_STATUS.DRAFT;

  const createAdjustment = useCreateAdjustment();
  const submitAdjustment = useSubmitAdjustment({ onConflict });
  const approveAdjustment = useApproveAdjustment({ onConflict });
  const rejectAdjustment = useRejectAdjustment({ onConflict });
  const postAdjustment = usePostAdjustment({ onConflict });
  const updateAdjustment = useUpdateAdjustment({ onConflict });
  const cancelAdjustment = useCancelAdjustment({ onConflict });
  const editAdjustment = useEditAdjustment({ onConflict });
  const abortController = useAbortController();

  const { data: itemsData, isLoading: isLoadingItems } = useItems();
  const items = itemsData?.data || [];
  const { data: varianceReasonsData } = useVarianceReasons();
  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.data || [];

  const [warehouseId, setWarehouseId] = useState(
    document?.warehouseId || (warehouses.length > 0 ? warehouses[0].id : ""),
  );
  const { data: lockState } = useWarehouseLock(warehouseId);
  const [reason, setReason] = useState<string>(document?.reason || "DAMAGE");
  const [notes, setNotes] = useState(document?.notes || "");
  const [lines, setLines] = useState<AdjustmentLine[]>(document?.lines || []);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );

  const currentVersionRef = useRef<number>(document?.version || 0);

  useEffect(() => {
    if (document?.version !== undefined) {
      currentVersionRef.current = document.version;
    }
  }, [document?.version]);

  const hasNegativeStock = useMemo(
    () =>
      lines.some((line) => {
        const scaledQtyBefore = getScaledQtyBefore(
          line.qtyBefore,
          line.uomId,
          line.item,
          items,
        );
        return (
          line.direction === "DECREASE" &&
          line.qtyAdjusted > scaledQtyBefore
        );
      }),
    [lines, items],
  );

  const hasInvalidCosts = useMemo(
    () =>
      lines.some(
        (line) =>
          line.direction === "INCREASE" &&
          (line.unitCost === null ||
            line.unitCost === undefined ||
            line.unitCost < 0),
      ),
    [lines],
  );

  const isValid = useMemo(
    () =>
      !!(
        warehouseId &&
        notes.length >= 10 &&
        notes.length <= 1000 &&
        lines.length > 0 &&
        lines.every((l) => l.qtyAdjusted > 0) &&
        !hasInvalidCosts
      ),
    [warehouseId, notes, lines, hasInvalidCosts],
  );

  const isSaving = updateAdjustment.isPending || createAdjustment.isPending;

  const warehouseItems = useMemo(
    () => warehouses.map((w) => ({ id: w.id, name: w.name || "" })),
    [warehouses],
  );

  const getLocalizedReasonName = useCallback((rawName: string) => {
    if (locale !== 'ar') return rawName;
    const nameLower = rawName.trim().toLowerCase();
    if (nameLower.includes('damage') || nameLower === 'telf') return 'تلف';
    if (nameLower.includes('spoilage') || nameLower.includes('expiry')) return 'إفساد / انتهاء صلاحية';
    if (nameLower.includes('theft') || nameLower.includes('loss')) return 'سرقة / فقدان';
    if (nameLower.includes('inventory correction') || nameLower.includes('correction')) return 'تصحيح مخزني';
    if (nameLower.includes('admin override') || nameLower.includes('override')) return 'تعديل إداري';
    if (nameLower.includes('found')) return 'بضاعة عُثر عليها';
    if (nameLower.includes('initial')) return 'مخزون أولي';
    return rawName;
  }, [locale]);

  const fallbackReasons = useMemo(() => [
    { id: 'Damage', name: getLocalizedReasonName('Damage') },
    { id: 'Spoilage', name: getLocalizedReasonName('Spoilage') },
    { id: 'Theft / Loss', name: getLocalizedReasonName('Theft / Loss') },
    { id: 'Inventory Correction', name: getLocalizedReasonName('Inventory Correction') },
    { id: 'Admin Override', name: getLocalizedReasonName('Admin Override') },
  ], [getLocalizedReasonName]);

  const reasonItems = useMemo(() => {
    const reasons = varianceReasonsData?.data;
    if (reasons && reasons.length > 0) {
      return reasons.map((r) => ({
        id: r.code || r.name,
        name: getLocalizedReasonName(r.name || r.code),
      }));
    }
    return fallbackReasons;
  }, [varianceReasonsData, fallbackReasons, getLocalizedReasonName]);

  const canEdit = !isLocked || isNew;

  // Dialog States
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);

  // Sync state with adjustment data when it arrives or changes records
  const [prevAdjustmentId, setPrevAdjustmentId] = useState<string | null>(null);
  if (document && document.id !== prevAdjustmentId) {
    setPrevAdjustmentId(document.id);
    setWarehouseId(document.warehouseId);
    setReason(document.reason);
    setNotes(document.notes ?? "");
    setLines(document.lines);
    setIdempotencyKey(crypto.randomUUID());
    if (document.version !== undefined) {
      currentVersionRef.current = document.version;
    }
  }

  // Refresh stock levels when warehouse changes
  useEffect(() => {
    if (canEdit && lines.length > 0) {
      setIsRefreshingStock(true);
      const refreshStock = async () => {
        const BalanceSchema = z.object({
          data: z.array(
            z.object({
              qtyOnHand: z.number(),
            }),
          ),
        });

        try {
          const updatedLines = await Promise.all(
            lines.map(async (line) => {
              try {
                const balanceRes = await apiClient.get(
                  `/inventory/balance?warehouse_id=${warehouseId}&search=${line.item.code}`,
                  BalanceSchema,
                  { signal: abortController.signal },
                );
                const currentQty = balanceRes.data?.[0]?.qtyOnHand ?? 0;
                return { ...line, qtyBefore: currentQty };
              } catch (err) {
                if (err instanceof Error && err.name === "AbortError")
                  throw err;
                return line;
              }
            }),
          );

          const hasChanged = updatedLines.some(
            (l, i) => l.qtyBefore !== lines[i].qtyBefore,
          );
          if (hasChanged && !abortController.signal.aborted) {
            setLines(updatedLines);
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          console.error("Failed to refresh stock:", err);
        } finally {
          if (!abortController.signal.aborted) {
            setIsRefreshingStock(false);
          }
        }
      };

      refreshStock();
    }
  }, [warehouseId, canEdit, abortController]);

  const handleSaveDraft = async (): Promise<AdjustmentDetail | null> => {
    if (lines.length === 0) return null;
    if (hasInvalidCosts) {
      toast.error(
        locale === "ar"
          ? "تكلفة الوحدة مطلوبة ويجب أن تكون أكبر من أو تساوي 0 لبنود الزيادة"
          : "Unit cost is required and must be >= 0 for increase lines.",
      );
      return null;
    }
    try {
      const payload = {
        version: currentVersionRef.current,
        warehouseId,
        reason,
        notes,
        lines: lines.map((l) => {
          const lineObj = l as unknown as AdjustmentFormLine;
          const lotIdVal = l.lotAllocations?.[0]?.lotId || lineObj.lotId || l.lot?.id || undefined;
          return {
            id: l.id.startsWith("new-") ? undefined : l.id,
            itemId: l.item.id,
            quantity: l.qtyAdjusted,
            qty: l.qtyAdjusted,
            uomId: l.uomId,
            direction: l.direction,
            unitCost: l.direction === "INCREASE" ? l.unitCost : null,
            lotId: lotIdVal,
            lotAllocations: l.lotAllocations?.length
              ? l.lotAllocations
              : (lotIdVal ? [{ lotId: lotIdVal, qty: l.qtyAdjusted }] : undefined),
          };
        }),
      };

      const headers = { "X-Idempotency-Key": idempotencyKey };

      if (isNew) {
        const res = await createAdjustment.mutateAsync({
          payload,
          signal: abortController.signal,
          headers,
        });
        toast.success(t("create_success"));
        router.push(`/adjustments`);
        return res;
      } else {
        const updatedDoc = await updateAdjustment.mutateAsync({
          id,
          payload,
          signal: abortController.signal,
          headers,
        });
        if (updatedDoc?.version !== undefined) {
          currentVersionRef.current = updatedDoc.version;
        }
        if (updatedDoc?.lines) {
          setLines(updatedDoc.lines as unknown as AdjustmentLine[]);
        }
        toast.success(t("update_success"));
        return updatedDoc;
      }
    } catch (e) {
      console.error(e);
      toast.error(tc("error_occurred"));
      throw e;
    }
  };

  const handleSubmit = async () => {
    try {
      const savedDoc = await handleSaveDraft();
      const versionToSubmit = savedDoc?.version ?? currentVersionRef.current;
      await submitAdjustment.mutateAsync({
        id,
        version: versionToSubmit,
        signal: abortController.signal,
      });
      toast.success(t("submit_success"));
      setSubmitDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async () => {
    await approveAdjustment.mutateAsync({
      id,
      version: currentVersionRef.current,
      signal: abortController.signal,
    });
    toast.success(t("approve_success"));
    setApproveDialogOpen(false);
  };

  const handleReject = async () => {
    const trimmedComment = rejectionComment.trim();
    if (trimmedComment.length < 15) return;
    await rejectAdjustment.mutateAsync({
      id,
      version: currentVersionRef.current,
      reject: trimmedComment,
      signal: abortController.signal,
    });
    toast.success(t("reject_success"));
    setRejectDialogOpen(false);
  };

  const handlePost = async () => {
    await postAdjustment.mutateAsync({
      id,
      version: currentVersionRef.current,
      signal: abortController.signal,
    });
    setPostDialogOpen(false);
    router.push(`/adjustments`);
  };

  const handleScan = async (barcode: string) => {
    if (!canEdit) {
      audioAlerts.playScanBlocked();
      setScanStatus("error");
      setStatusMessage(
        t("warehouse_locked_title") || "Warehouse is locked. Scan blocked.",
      );
      return;
    }

    const resetAfterDelay = () => {
      setTimeout(() => {
        setScanStatus("idle");
        setStatusMessage(undefined);
      }, 2000);
    };

    try {
      setScanStatus("idle");
      setStatusMessage(undefined);

      const resolved = await resolveBarcodeAndUom(barcode, undefined, abortController.signal);

      if (resolved) {
        const { item, uomId: scannedUomId } = resolved;
        const targetUomId = scannedUomId || item.primaryUom?.id || '';

        const BalanceSchema = z.object({
          data: z.array(
            z.object({
              qtyOnHand: z.number(),
            }),
          ),
        });
        const balanceRes = await apiClient.get(
          `/inventory/balance?warehouse_id=${warehouseId}&search=${item.code}`,
          BalanceSchema,
          { signal: abortController.signal },
        );
        const currentQty = balanceRes.data?.[0]?.qtyOnHand ?? 0;

        setLines((prev) => {
          const existing = prev.find((l) => l.item.id === item.id && l.uomId === targetUomId);
          if (existing) {
            return prev.map((l) =>
              (l.item.id === item.id && l.uomId === targetUomId)
                ? {
                  ...l,
                  qtyAdjusted: l.qtyAdjusted + 1,
                  qtyBefore: currentQty,
                }
                : l,
            );
          }
          return [
            ...prev,
            {
              id: `new-${Date.now()}`,
              item: {
                id: item.id,
                code: item.code,
                name: item.name,
                image: item.image,
                primaryUom: item.primaryUom || { id: targetUomId, code: targetUomId },
              },
              direction: "INCREASE",
              qtyBefore: currentQty,
              qtyAdjusted: 1,
              unitCost: 0,
              uomId: targetUomId,
              reasonNotes: "",
            },
          ];
        });

        audioAlerts.playScanSuccess();
        setScanStatus("success");
        setStatusMessage(undefined);
        resetAfterDelay();
      } else {
        setScanStatus("error");
        setStatusMessage(t("scan.not_found"));
        resetAfterDelay();
      }
    } catch {
      setScanStatus("error");
      setStatusMessage(tc("error"));
      resetAfterDelay();
    }
  };

  const removeLine = (id: string) => {
    if (!canEdit) return;
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = useCallback(
    (id: string, updates: Partial<AdjustmentLine>) => {
      if (!canEdit) return;
      setLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      );
    },
    [canEdit],
  );

  const timelineEntries = useMemo(() => {
    if (!document || isNew) return [];

    const docAny = document as unknown as Record<string, unknown>;
    const cachedTimeline = docAny.timeline as {
      status: string;
      at: string;
      by: string;
    }[] | undefined;

    if (cachedTimeline && cachedTimeline.length > 0) {
      return cachedTimeline.map(e => ({
        status: e.status.toLowerCase() as Status,
        at: e.at,
        by: e.by
      }));
    }

    const h: { status: Status; at: string; by: string }[] = [
      {
        status: 'draft' as Status,
        at: document.createdAt ?? new Date().toISOString(),
        by: (docAny.createdBy as string) || (docAny.createdByName as string) || tc('system_user') || 'System'
      }
    ];

    const currentStatusNorm = (document.status || '').toLowerCase();

    if (currentStatusNorm !== 'draft') {
      const statusTime = (docAny.submittedAt as string) || (docAny.updatedAt as string) || document.createdAt || new Date().toISOString();
      const statusUser = (docAny.approvedBy as string) || (docAny.submittedBy as string) || (docAny.createdBy as string) || (docAny.createdByName as string) || tc('system_user') || 'System';
      const normalizedStatus = (currentStatusNorm.includes('submitted') ? 'submitted' : currentStatusNorm) as Status;

      h.push({
        status: normalizedStatus,
        at: statusTime,
        by: statusUser
      });
    }

    if (currentStatusNorm === 'posted' || document.postedAt) {
      const postedTime = document.postedAt || (docAny.updatedAt as string) || document.createdAt || new Date().toISOString();
      const postedUser = (docAny.postedBy as string) || (docAny.createdBy as string) || tc('system_user') || 'System';
      if (!h.some(entry => entry.status === 'posted')) {
        h.push({
          status: 'posted' as Status,
          at: postedTime,
          by: postedUser
        });
      }
    }

    return h;
  }, [document, isNew, tc]);

  const extraColumns = useMemo(
    () => [
      {
        header: t("direction") || "Direction",
        headerClassName: "min-w-[150px]",
        cellClassName: "min-w-[150px]",
        cell: (line: AdjustmentFormLine) => {
          if (!canEdit) {
            return line.direction === "INCREASE" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <ArrowUp className="w-3 h-3" />
                {t("direction_increase") || (locale === "ar" ? "زيادة" : "Inc")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                <ArrowDown className="w-3 h-3" />
                {t("direction_decrease") || (locale === "ar" ? "نقص" : "Dec")}
              </span>
            );
          }
          const r = String(reason || "").trim().toLowerCase();
          const isDecreaseOnly = r.includes("damage") || r.includes("spoilage") || r.includes("theft") || r.includes("loss");
          const isDisabled = !canEdit || isDecreaseOnly;
          return (
            <div className="flex justify-center">
              <div className="inline-flex items-center rounded p-0.5 bg-muted border border-border shadow-inner">
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => updateLine(line.id, { direction: "INCREASE" })}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-1 whitespace-nowrap active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed",
                    line.direction === "INCREASE"
                      ? "bg-brand-gold text-slate-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ArrowUp className="w-3 h-3" />
                  {t("direction_increase") || (locale === "ar" ? "زيادة" : "INC")}
                </button>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => updateLine(line.id, { direction: "DECREASE" })}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-sm transition-all flex items-center gap-1 whitespace-nowrap active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed",
                    line.direction === "DECREASE"
                      ? "bg-destructive text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ArrowDown className="w-3 h-3" />
                  {t("direction_decrease") || (locale === "ar" ? "نقص" : "DEC")}
                </button>
              </div>
            </div>
          );
        },
      },
      {
        header: locale === "ar" ? "تكلفة الوحدة" : "Unit Cost",
        headerClassName: "min-w-[130px]",
        cellClassName: "min-w-[130px]",
        cell: (line: AdjustmentFormLine) => {
          const isIncrease = line.direction === "INCREASE";
          if (!canEdit) {
            return (
              <span className="font-mono text-sm font-bold text-foreground">
                {line.unitCost !== null && line.unitCost !== undefined
                  ? Number(line.unitCost).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                  : "—"}
              </span>
            );
          }
          return (
            <div className="flex justify-center w-full min-w-0">
              <UnitCostInput
                value={line.unitCost}
                disabled={!isIncrease || !canEdit}
                placeholder={isIncrease ? "0" : "-"}
                onChange={(val) => {
                  updateLine(line.id, { unitCost: val });
                }}
                className={cn(
                  "w-full text-center font-black text-sm h-9 bg-surface-container-highest/30 border border-border text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-md outline-none transition-all shadow-sm disabled:opacity-30 disabled:bg-transparent disabled:border-transparent disabled:shadow-none min-w-0 px-1",
                  isIncrease &&
                  (line.unitCost === null ||
                    line.unitCost === undefined ||
                    line.unitCost < 0) &&
                  "border-red-500/50 focus:ring-red-500/30",
                )}
              />
            </div>
          );
        },
      },
      {
        header: t("qty_before") || "Qty Before",
        headerClassName: "min-w-[100px] text-center whitespace-nowrap",
        cellClassName: "min-w-[100px] text-center",
        cell: (line: AdjustmentFormLine) => {
          const scaledQtyBefore = getScaledQtyBefore(
            line.qtyBefore,
            line.uomId,
            line.item,
            items,
          );
          return (
            <div className="flex flex-col items-center gap-0.5 tabular-nums">
              <span
                className="text-body-md font-bold text-muted-foreground/60"
                lang="en"
                dir="ltr"
              >
                {Number(scaledQtyBefore).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}
              </span>
            </div>
          );
        },
      },
      {
        header: t("qty_after") || "Qty After",
        headerClassName: "min-w-[100px] text-center whitespace-nowrap",
        cellClassName: "min-w-[100px] text-center",
        cell: (line: AdjustmentFormLine) => {
          const scaledQtyBefore = getScaledQtyBefore(
            line.qtyBefore,
            line.uomId,
            line.item,
            items,
          );
          const after =
            line.direction === "INCREASE"
              ? scaledQtyBefore + line.qtyAdjusted
              : scaledQtyBefore - line.qtyAdjusted;
          return (
            <div className="flex flex-col items-center justify-center gap-0 sm:gap-1.5 tabular-nums min-w-0 sm:min-w-[100px] text-center whitespace-normal">
              <span
                className={cn(
                  "font-mono font-bold",
                  after < 0 ? "text-red-500" : "text-foreground",
                )}
                lang="en"
                dir="ltr"
              >
                {Number(after).toLocaleString("en-US", {
                  maximumFractionDigits: 4,
                })}
              </span>
              {after < 0 && (
                <span className="qty-error text-[10px] md:text-xs text-red-500 leading-tight font-semibold uppercase mt-1 z-10">
                  {t("errors.exceeds_available_stock")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: tc("table_headers.lot") || "Lot",
        headerClassName: "min-w-[140px] max-w-[160px] text-center whitespace-nowrap",
        cellClassName: "min-w-[140px] max-w-[160px] text-center truncate",
        cell: (line: AdjustmentFormLine) => {
          if (!canEdit) {
            const rawLine = line as unknown as Record<string, unknown>;
            const displayLot =
              line.lot?.lotNumber ||
              line.lotNumber ||
              line.lot_number ||
              line.lotAllocations?.[0]?.lotNumber ||
              (typeof rawLine.lotId === 'string' ? rawLine.lotId : "") ||
              "";
            const lotVal = displayLot || "—";
            return (
              <span className="font-mono text-[11px] md:text-xs font-bold text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-lg border border-brand-gold/20 truncate inline-block max-w-[150px]" title={lotVal}>
                {lotVal}
              </span>
            );
          }
          return (
            <AdjustmentLotSelector
              itemId={line.item.id}
              warehouseId={warehouseId}
              value={line.lotAllocations?.[0]?.lotId || line.lotId || undefined}
              lotNumber={line.lot?.lotNumber || line.lotNumber || undefined}
              direction={line.direction}
              disabled={!canEdit || !!lockState?.isLocked}
              locale={locale as "ar" | "en"}
              onChange={(lotId, lotNumber, expiryDate) => {
                updateLine(line.id, {
                  lotAllocations: [{ lotId, qty: line.qtyAdjusted }],
                  lot: { id: lotId, lotNumber, expiryDate: expiryDate || null },
                });
              }}
            />
          );
        },
      },
    ],
    [locale, t, tc, canEdit, updateLine, warehouseId, lockState?.isLocked, reason, items],
  );


  return (
    <div className="min-h-screen pb-12 animate-in fade-in duration-500 print:bg-card print:p-0 print:m-0 print:pb-0 print:animate-none">
      {/* Print header (visible only when printing) */}
      <div className="print-only print-header p-8 border-b-2 border-gray-300 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase">
              {tp("adjustment_voucher_title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {document?.documentNumber || ""}
            </p>
          </div>
          <div className="text-end text-sm text-muted-foreground">
            <p>
              {document?.createdAt
                ? formatDate(document.createdAt, locale as "ar" | "en")
                : ""}
            </p>
          </div>
        </div>
      </div>
      {/* Sticky Glass Header */}
      <StickyGlassHeader
        title={isNew ? t("create_new") : document?.documentNumber || "..."}
        onBack={() => router.push('/adjustments')}
        statusBadge={
          !isNew ? (
            <>
              <StatusBadge status={adjustmentStatus as BadgeStatus} />
              <ClientOnlyTime
                date={document?.createdAt}
                mode="date"
                locale={locale as "ar" | "en"}
                className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0"
              />
            </>
          ) : undefined
        }
        actions={
          <DocumentExportMenu
            documentType="ADJUSTMENT"
            documentId={isNew ? undefined : id}
            documentNumber={document?.documentNumber}
          />
        }
        isEditing={true}
      />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="max-w-[1920px] w-full mx-auto px-1 sm:px-4 lg:px-6 mt-3 sm:mt-6 space-y-4 sm:space-y-6"
      >
        <DocumentLockBanner
          status={adjustmentStatus}
          isLocked={isLocked}
          className="print-hidden"
        />

        {lockState?.isLocked && (
          <div
            aria-live="assertive"
            className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 animate-pulse print-hidden"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-label-sm font-bold uppercase">
                {t("warehouse_locked_title") || "Warehouse Locked"}
              </p>
              <p className="text-body-xs font-semibold mt-0.5">
                {t("warehouse_locked_warn_desc") ||
                  "This warehouse is locked for stocktake or system adjustments. Edits and scans are permitted with caution."}
              </p>
            </div>
          </div>
        )}

        <DocumentLockWrapper isLocked={isLocked}>
          <div className="flex-1 w-full p-1 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 print:block items-start max-w-[1920px] mx-auto">
              {/* Main Content: Unified Master Container (Document Details + Items Table) */}
              <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                <div className="bg-card backdrop-blur-3xl p-3.5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden shadow-2xl border border-border/70 space-y-6 lg:space-y-8 transition-all duration-500 group">
                  {/* Decorative background glow */}
                  <div className="absolute top-0 end-0 w-96 h-96 bg-brand-gold/5 blur-[100px] pointer-events-none rounded-full" />
                  <div className="absolute bottom-0 start-0 w-80 h-80 bg-brand-gold/5 blur-[90px] pointer-events-none rounded-full" />

                  {/* SECTION 1: Document Details (تفاصيل الوثيقة) */}
                  <div className="relative border-b border-slate-200/60 dark:border-white/10 pb-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-brand-gold/10 dark:bg-brand-gold/15 flex items-center justify-center border border-brand-gold/30 shadow-sm">
                        <Warehouse className="w-5.5 h-5.5 text-brand-gold" />
                      </div>
                      <div>
                        <h3 className="text-body-lg font-black uppercase tracking-widest text-slate-800 dark:text-white">
                          {t("details_section")}
                        </h3>
                        <p className="text-xs text-muted-foreground/70 font-semibold mt-0.5">
                          {locale === 'ar' ? 'بيانات المستودع والسبب والتفاصيل' : 'Warehouse & Document Specification'}
                        </p>
                      </div>
                    </div>

                    {/* 3-Column Responsive Header Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/70 ms-1 flex items-center gap-1">
                          {tc("warehouse")} <span className="text-destructive">*</span>
                        </label>
                        <SmartCombobox
                          items={warehouseItems}
                          value={warehouseId}
                          onSelect={(item) => setWarehouseId(item.id)}
                          placeholder={tc("warehouse") || "Select Warehouse"}
                          disabled={!canEdit}
                          triggerClassName="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-12 px-5 rounded-xl text-label-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/70 ms-1 flex items-center gap-1">
                          {t("reason")} <span className="text-destructive">*</span>
                        </label>
                        <SmartCombobox
                          items={reasonItems}
                          value={reason}
                          onSelect={(item) => setReason(item.id)}
                          placeholder={t("reason") || "Select Reason"}
                          disabled={!canEdit}
                          triggerClassName="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-12 px-5 rounded-xl text-label-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-label-xs font-bold uppercase tracking-wider text-muted-foreground/70 ms-1">
                          {tc("notes")}
                        </label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          readOnly={!canEdit}
                          placeholder={t("notes_placeholder")}
                          className={cn(
                            "h-12 p-3 text-body-sm resize-none transition-all w-full leading-snug",
                            !canEdit
                              ? "bg-surface-container-highest/20 backdrop-blur-sm border border-border/50 rounded-xl text-muted-foreground cursor-default select-all shadow-inner"
                              : "bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm rounded-xl focus:ring-2 focus:ring-brand-gold/30 text-foreground placeholder:text-muted-foreground/50"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Items Table Section */}
                  <div className="relative space-y-6">
                    {/* Add Item Bar (Scanning + Combobox) */}
                    {canEdit && adjustmentStatus !== ADJUSTMENT_STATUS.POSTED && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-brand-gold/10 dark:bg-brand-gold/15 flex items-center justify-center border border-brand-gold/30 shadow-sm">
                            <PackagePlus className="w-5.5 h-5.5 text-brand-gold" />
                          </div>
                          <h3 className="text-body-lg font-black uppercase tracking-widest text-foreground">
                            {t("add_item")}
                          </h3>
                        </div>

                        <div className="flex flex-col md:flex-row items-end gap-4">
                          <div className="flex-1 space-y-2 w-full text-center md:text-start">
                            <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block text-center md:text-start">
                              {locale === 'ar' ? 'مسح الباركود' : 'Barcode Scanner'}
                            </label>
                            <ScanInput
                              onScan={handleScan}
                              placeholder={t("scan_placeholder")}
                              scanStatus={scanStatus}
                              statusMessage={statusMessage}
                              disabled={isRefreshingStock}
                              className="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-[52px] px-5 rounded-xl text-label-sm font-semibold focus-within:ring-2 focus-within:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground"
                            />
                          </div>
                          <div className="flex-1 space-y-2 w-full text-center md:text-start">
                            <label className="text-label-xs font-semibold uppercase text-muted-foreground/40 ms-1 whitespace-nowrap block text-center md:text-start">
                              {locale === 'ar' ? 'البحث عن صنف' : 'Search / Add Item'}
                            </label>
                            <SmartCombobox
                              items={items || []}
                              onSelect={(item) => handleScan(item.code)}
                              placeholder={
                                locale === "ar"
                                  ? "ابحث عن صنف لإضافته..."
                                  : "Search item to add..."
                              }
                              disabled={
                                isLoadingItems || !canEdit || isRefreshingStock
                              }
                              triggerClassName="w-full bg-surface-container-highest/30 backdrop-blur-md border border-border/70 shadow-sm h-[52px] px-5 rounded-xl text-label-sm font-semibold focus-visible:ring-2 focus-visible:ring-brand-gold/30 transition-all hover:bg-surface-container-highest/60 text-foreground text-center md:text-start justify-center md:justify-start"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Table Header & DocumentLineItemTable */}
                    {isRefreshingStock && (
                      <InlineLoader
                        label={t("refreshing_stock")}
                        className="mb-2"
                      />
                    )}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-brand-gold/10 dark:bg-brand-gold/15 flex items-center justify-center border border-brand-gold/30">
                            <Package className="w-5 h-5 text-brand-gold" />
                          </div>
                          <div>
                            <h3 className="text-body-md font-bold uppercase tracking-widest text-foreground">
                              {tc("items")}
                            </h3>
                            <span className="text-xs font-mono font-bold text-brand-gold">
                              {lines.length} {tc('entries') || 'Entries'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-card backdrop-blur-xl shadow-xl rounded-[2rem] border border-border/70 overflow-hidden">
                        <DocumentLineItemTable<AdjustmentFormLine>
                          lines={lines.map((l): AdjustmentFormLine => {
                            const lineObj = l as unknown as AdjustmentFormLine;
                            const lotAllocationsTyped = l.lotAllocations as (LotAllocation & { lotNumber?: string })[] | undefined;
                            const lotNum =
                              l.lot?.lotNumber ||
                              lineObj.lotNumber ||
                              lineObj.lot_number ||
                              lotAllocationsTyped?.[0]?.lotNumber ||
                              "";
                            return {
                              ...l,
                              qty: l.qtyAdjusted,
                              lot: lotNum
                                ? {
                                  lotNumber: lotNum,
                                  expiryDate: l.lot?.expiryDate ? String(l.lot.expiryDate) : null,
                                }
                                : (l.lot ? { lotNumber: l.lot.lotNumber, expiryDate: l.lot.expiryDate ? String(l.lot.expiryDate) : null } : null),
                              lotAllocations: lotAllocationsTyped?.map((la) => {
                                const qVal = la.allocatedQty ?? ((la as unknown as Record<string, number>).qty || 0);
                                return {
                                  lotId: la.lotId,
                                  lotNumber: la.lotNumber || lotNum,
                                  allocatedQty: qVal,
                                  qty: qVal,
                                };
                              }),
                            };
                          })}
                          locale={locale as "ar" | "en"}
                          isReadOnly={!canEdit || !!lockState?.isLocked}
                          onRemoveLine={(id) => removeLine(id)}
                          hideLotColumns={true}
                          dense={true}
                          enableVirtualization={true}
                          maxHeight="650px"
                          noCollapse={false}
                          mobileLayoutPattern="adjustment-form"
                          headers={{
                            qty: t("qty_adjusted"),
                          }}
                          renderQty={(line) =>
                            !canEdit ? (
                              <span className="font-mono text-body-md font-bold text-foreground">
                                {Number(line.qty).toLocaleString("en-US")}
                              </span>
                            ) : (
                              <div className="flex justify-center w-full min-w-0">
                                <Input
                                  type="number"
                                  min="0.001"
                                  step="0.001"
                                  value={line.qty}
                                  lang="en"
                                  dir="ltr"
                                  style={{ direction: "ltr" }}
                                  readOnly={!canEdit || !!lockState?.isLocked}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    updateLine(line.id, { qtyAdjusted: val || 0 });
                                  }}
                                  className="w-full text-center font-black text-sm h-9 bg-surface-container-highest/30 backdrop-blur-md border border-border/70 text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold rounded-md outline-none transition-all shadow-sm min-w-0 px-1"
                                />
                              </div>
                            )
                          }
                          renderUom={(line) => {
                            const matchedItem = items.find(
                              (i) => i.id === line.item?.id || i.code === line.item?.code,
                            ) || line.item;
                            const availableUoms = getAvailableUomsForItem(matchedItem);

                            if (!canEdit || availableUoms.length <= 1) {
                              const resolvedCode = resolveUomCode(line.uomId, matchedItem);
                              return (
                                <div className="flex items-center justify-center w-full">
                                  <span className="h-9 px-3 text-xs font-bold font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex items-center justify-center min-w-[70px]">
                                    {resolvedCode}
                                  </span>
                                </div>
                              );
                            }

                            const comboboxItems = availableUoms.map((u) => ({
                              id: u.id,
                              name: u.name || u.code,
                              code: u.code,
                            }));

                            return (
                              <div className="flex items-center justify-center w-full">
                                <SmartCombobox
                                  items={comboboxItems}
                                  value={line.uomId}
                                  onSelect={(uom) => {
                                    updateLine(line.id, { uomId: uom.id });
                                  }}
                                  placeholder={line.item?.primaryUom?.code || "UOM"}
                                  triggerClassName="h-9 px-3 text-sm border border-border/70 bg-surface-container-highest/30 backdrop-blur-md text-foreground text-center rounded-xl w-full md:w-28 font-semibold shadow-sm focus-visible:ring-brand-gold transition-all"
                                />
                              </div>
                            );
                          }}
                          extraColumns={extraColumns}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar (col-span-12 lg:col-span-4 xl:col-span-3): Audit Trail & Document Information */}
              <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-6 print-hidden">
                <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] group border border-slate-200/60 dark:border-white/5">
                  <div className="absolute top-0 end-0 w-32 h-32 bg-brand-gold/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-brand-gold/10 transition-all duration-700" />
                  <div className="relative space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand-gold/10 dark:bg-brand-gold/5 flex items-center justify-center border border-brand-gold/20">
                        <History className="w-5 h-5 text-brand-gold" />
                      </div>
                      <h4 className="text-label-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white/90">
                        {tc("audit_trail")}
                      </h4>
                    </div>
                    {timelineEntries.length > 0 ? (
                      <div className="ps-2">
                        <StatusTimeline entries={timelineEntries} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 opacity-20 gap-3">
                        <Clock className="w-10 h-10" />
                        <p className="text-label-xs font-semibold uppercase">
                          {t("no_history")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DocumentLockWrapper>

        {isLocked ? (
          <div className="static md:sticky md:bottom-0 z-40 md:z-50 bg-card/95 backdrop-blur-2xl border border-border md:border-x-0 md:border-b-0 md:border-t p-4 md:px-8 md:py-5 mt-6 md:mt-auto flex flex-col md:flex-row items-center justify-between gap-4 print-hidden w-full shadow-2xl rounded-2xl md:rounded-none">
            <div className="flex items-center text-slate-600 dark:text-slate-400 text-xs md:text-sm gap-3 font-bold bg-slate-100 dark:bg-slate-900/50 px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/5 w-full md:w-auto justify-center md:justify-start">
              <Info className="w-5 h-5 text-brand-gold shrink-0" />
              <span>{t("document_locked")}</span>
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-row md:items-center md:justify-end gap-2.5 md:gap-3 w-full md:w-auto">
              <div className="col-span-2 md:w-auto">
                <button
                  type="button"
                  onClick={() => router.push("/adjustments")}
                  className="px-4 md:px-6 py-3 rounded-xl border border-border/60 bg-surface-container-highest/60 hover:bg-surface-container-highest text-foreground font-bold uppercase tracking-wider text-xs shadow-sm transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full md:w-auto"
                >
                  {locale === "ar" ? "إغلاق" : "Close"}
                </button>
              </div>

              <PermissionGate action="reject" resource="operations_adjustments">
                <div className="col-span-2 md:w-auto">
                  <ActionGuard
                    documentType="ADJUSTMENT"
                    status={adjustmentStatus}
                    action="REJECT"
                    role={user?.role || ""}
                  >
                    <button
                      type="button"
                      onClick={() => setRejectDialogOpen(true)}
                      className="px-4 md:px-6 py-3 rounded-xl bg-gradient-to-r from-rose-950/90 to-red-900/90 hover:from-rose-900 hover:to-red-800 text-rose-200 font-bold text-xs md:text-sm uppercase tracking-wider border border-rose-500/40 hover:border-rose-400/60 shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                      <XCircleIcon className="w-4 h-4 shrink-0" /> {t("reject")}
                    </button>
                  </ActionGuard>
                </div>
              </PermissionGate>

              <PermissionGate
                action="approve"
                resource="operations_adjustments"
              >
                <div className="col-span-2 md:w-auto">
                  <ActionGuard
                    documentType="ADJUSTMENT"
                    status={adjustmentStatus}
                    action="APPROVE"
                    role={user?.role || ""}
                  >
                    <button
                      type="button"
                      onClick={() => setApproveDialogOpen(true)}
                      className="px-5 md:px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/45 hover:-translate-y-0.5 border border-emerald-400/40 w-full md:w-auto"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 shrink-0" /> {t("approve")}
                    </button>
                  </ActionGuard>
                </div>
              </PermissionGate>

              <ActionGuard
                documentType="ADJUSTMENT"
                status={adjustmentStatus}
                action="SUBMIT"
                role={user?.role || ""}
              >
                <div className="col-span-2 md:w-auto">
                  <button
                    type="button"
                    onClick={() => setSubmitDialogOpen(true)}
                    className="px-5 md:px-7 py-3 rounded-xl bg-gradient-to-r from-brand-gold via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-brand-black font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/25 hover:shadow-brand-gold/45 hover:-translate-y-0.5 border border-amber-300/50 w-full md:w-auto"
                  >
                    <Send className="w-4 h-4 shrink-0" /> {t("submit_for_approval")}
                  </button>
                </div>
              </ActionGuard>

              <ActionGuard
                documentType="ADJUSTMENT"
                status={adjustmentStatus}
                action="EDIT"
                role={user?.role || ""}
              >
                <div className="col-span-2 md:w-auto">
                  <button
                    type="button"
                    onClick={() =>
                      editAdjustment.mutate({
                        id,
                        version: document?.version ?? 0,
                      })
                    }
                    className="px-4 md:px-6 py-3 rounded-xl bg-brand-gold text-brand-black font-bold text-xs md:text-sm uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 transition-all w-full md:w-auto"
                  >
                    <Pencil className="w-4 h-4 shrink-0" /> {t("edit_rejected")}
                  </button>
                </div>
              </ActionGuard>

              <PermissionGate action="post" resource="operations_adjustments">
                <div className="col-span-2 md:w-auto">
                  <ActionGuard
                    documentType="ADJUSTMENT"
                    status={adjustmentStatus}
                    action="POST"
                    role={user?.role || ""}
                  >
                    <button
                      type="button"
                      onClick={() => setPostDialogOpen(true)}
                      className="px-4 md:px-6 py-3 rounded-xl bg-gradient-to-r from-brand-gold to-amber-400 text-brand-black font-black text-xs md:text-sm uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20 hover:-translate-y-0.5 transition-all w-full md:w-auto"
                    >
                      <CheckCircleIcon className="w-4 h-4 shrink-0" />{" "}
                      {t("post_adjustment")}
                    </button>
                  </ActionGuard>
                </div>
              </PermissionGate>

              <ActionGuard
                documentType="ADJUSTMENT"
                status={adjustmentStatus}
                action="CANCEL"
                role={user?.role || ""}
              >
                <div className="col-span-2 md:w-auto">
                  <button
                    type="button"
                    onClick={() => setCancelDialogOpen(true)}
                    className="px-4 md:px-6 py-3 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-wider border border-border/60 hover:border-brand-gold/40 shadow-sm transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 w-full md:w-auto"
                  >
                    <XCircleIcon className="w-4 h-4 shrink-0" /> {t("cancel_adjustment")}
                  </button>
                </div>
              </ActionGuard>
            </div>
          </div>
        ) : (
          <div className="static md:sticky md:bottom-0 z-40 md:z-50 bg-card/95 backdrop-blur-2xl border border-border md:border-x-0 md:border-b-0 md:border-t p-4 md:px-8 md:py-5 mt-6 md:mt-auto flex flex-col md:flex-row items-center justify-between gap-4 print-hidden w-full shadow-2xl rounded-2xl md:rounded-none">
            {!isValid && canEdit ? (
              <div className="flex items-center gap-3 text-sm font-bold text-brand-gold bg-brand-gold/10 px-5 py-3 rounded-2xl animate-pulse border border-brand-gold/20 w-full md:w-auto justify-center md:justify-start">
                <Info className="w-5 h-5 shrink-0" />
                <span>
                  {locale === "ar"
                    ? "يرجى كتابة الملاحظات واختيار مستودع لتفعيل زر الحفظ"
                    : "Please write notes and select a warehouse to enable saving"}
                </span>
              </div>
            ) : (
              <div />
            )}
            <div className="grid grid-cols-2 md:flex md:flex-row md:items-center md:justify-end gap-2.5 md:gap-3 w-full md:w-auto">
              <div className="col-span-2 md:w-auto">
                <button
                  type="button"
                  onClick={() => router.push("/adjustments")}
                  disabled={isSaving}
                  className="px-4 md:px-6 py-3 rounded-xl border border-border/60 bg-surface-container-highest/60 hover:bg-surface-container-highest text-foreground font-bold uppercase tracking-wider text-xs shadow-sm transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full md:w-auto"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0 rtl:rotate-180" />
                  {locale === "ar" ? "عودة" : "Back"}
                </button>
              </div>

              {!isNew && (
                <div className="col-span-2 md:w-auto">
                  <ActionGuard
                    documentType="ADJUSTMENT"
                    status={adjustmentStatus}
                    action="SUBMIT"
                    role={user?.role || ""}
                  >
                    <button
                      type="button"
                      onClick={() => setSubmitDialogOpen(true)}
                      className="px-5 md:px-7 py-3 rounded-xl bg-gradient-to-r from-brand-gold via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-brand-black font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/25 hover:shadow-brand-gold/45 hover:-translate-y-0.5 border border-amber-300/50 w-full md:w-auto"
                    >
                      <Send className="w-4.5 h-4.5 shrink-0" /> {t("submit_for_approval")}
                    </button>
                  </ActionGuard>
                </div>
              )}

              {(isNew || document?.status === 'DRAFT') && (
                <div className="col-span-2 md:w-auto">
                  <Button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={
                      lines.length === 0 ||
                      notes.trim().length < 10 ||
                      isRefreshingStock ||
                      createAdjustment.isPending ||
                      updateAdjustment.isPending
                    }
                    isLoading={createAdjustment.isPending || updateAdjustment.isPending}
                    className="px-5 md:px-7 py-3 rounded-xl bg-gradient-to-r from-brand-gold via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-brand-black font-black text-xs md:text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/25 hover:shadow-brand-gold/45 hover:-translate-y-0.5 border border-amber-300/50 w-full md:w-auto"
                  >
                    <Save className="w-4.5 h-4.5 shrink-0" /> {tc("actions.save") || "Save"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </form>

      {/* Confirmation Dialogs */}
      <PostConfirmDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        title={t("submit_confirm_title")}
        description={t("submit_confirm_desc")}
        onConfirm={handleSubmit}
        isLoading={submitAdjustment.isPending}
      />

      <PostConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        title={t("reject_title")}
        description={t("reject_desc")}
        onConfirm={handleReject}
        variant="destructive"
        icon="reject"
        confirmText={t("confirm_rejection")}
        disabled={rejectionComment.trim().length < 15}
      >
        <div className="space-y-4">
          <label className="text-label-xs font-bold text-muted-foreground/40 uppercase ms-1">
            {t("rejection_reason_label")}
          </label>
          <Textarea
            value={rejectionComment}
            onChange={(e) => setRejectionComment(e.target.value)}
            placeholder={t("rejection_comment_placeholder")}
            className="bg-surface-container-high/40 border-none rounded-2xl min-h-[120px] p-4 text-body-md font-medium focus:ring-1 focus:ring-operational-cyan/30 resize-none transition-all"
          />
          {rejectionComment.trim().length > 0 &&
            rejectionComment.trim().length < 15 && (
              <div className="flex items-center gap-2 text-status-error p-3 bg-status-error/5 rounded-xl border border-status-error/10">
                <AlertCircle className="w-3.5 h-3.5" />
                <p className="text-label-xxs font-bold uppercase">
                  {t("min_chars_required", {
                    count: 15 - rejectionComment.trim().length,
                  })}
                </p>
              </div>
            )}
        </div>
      </PostConfirmDialog>

      <PostConfirmDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        title={t("approve_confirm_title")}
        description={t("approve_confirm_desc")}
        onConfirm={handleApprove}
        isLoading={approveAdjustment.isPending}
      />

      <PostConfirmDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        title={t("post_confirm_title")}
        description={t("post_confirm_desc")}
        warningText={t("post_irreversible")}
        requiresTextConfirmation={true}
        onConfirm={handlePost}
        isLoading={postAdjustment.isPending}
      />

      <PostConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={tc("cancel") || "Cancel Adjustment"}
        description={
          t("cancel_confirm_desc") ||
          "Are you sure you want to cancel this adjustment? This action cannot be undone."
        }
        onConfirm={() => {
          cancelAdjustment.mutate(
            { id, version: document?.version ?? 0, reason: cancelReason },
            {
              onSuccess: () => {
                toast.success(t("cancelled_success") || "Adjustment cancelled");
                setCancelDialogOpen(false);
              },
              onError: () => {
                toast.error(tc("error") || "Error");
              },
            },
          );
        }}
        variant="destructive"
        icon="reject"
        confirmText={tc("cancel")}
        disabled={cancelAdjustment.isPending}
        isLoading={cancelAdjustment.isPending}
      >
        <div className="space-y-3">
          <label className="text-label-xs font-semibold uppercase text-muted-foreground/50">
            {tc("reason") || "Reason"} (optional)
          </label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={tc("enter_reason") || "Enter reason..."}
            className="bg-surface-container-high/40 border-none rounded-2xl min-h-[80px] p-4 text-body-md font-medium focus:ring-1 focus:ring-red-500/30 resize-none transition-all"
          />
        </div>
      </PostConfirmDialog>
    </div>
  );
}
