"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard"
import { useGoodsReceipt, useUpdateGRNLine } from "@/features/purchasing/api/useGoodsReceipts"
import { useItems } from "@/features/items/hooks/useItems"
import { PackageSearch } from "lucide-react"
import { toast } from "sonner"
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { isDocumentLocked, type DocumentStatus } from "@logirest/shared-types"
import { formatDate } from "@/utils/currency"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/shared/PageHeader"
import { ScanInput } from "@/components/shared/ScanInput/ScanInput"
import { PageSkeleton } from "@/components/shared/PageSkeleton"
import { ErrorState } from "@/components/shared/ErrorState"
import { LotEntryModal } from "./LotEntryModal"
import { StatusBadge } from "@/components/shared/StatusBadge"

interface GRNScanClientProps {
    id: string
    locale: "ar" | "en"
}

export function GRNScanClient({ id, locale }: GRNScanClientProps) {
    const t = useTranslations("procurement.grn")
    const common = useTranslations("common")
    const [isDirtyScanSession, setIsDirtyScanSession] = React.useState(false)
    const { router } = useUnsavedChangesGuard(isDirtyScanSession)
    const { playSound } = useAudioFeedback()

    const { data: grn, isLoading: isLoadingGRN, error: errorGRN } = useGoodsReceipt(id)
    const { data: itemsData, isLoading: isLoadingItems, error: errorItems } = useItems(); const items = itemsData?.data || []
    const updateLine = useUpdateGRNLine()

    const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle")
    const [statusMessage, setStatusMessage] = React.useState("")

    // Modal state
    const [lotModalOpen, setLotModalOpen] = React.useState(false)
    const [pendingItem, setPendingItem] = React.useState<{ id: string; name: string; barcode: string } | null>(null)

    if (isLoadingGRN || isLoadingItems) return <PageSkeleton variant="detail" />
    if (errorGRN || errorItems || !grn) return <ErrorState onRetry={() => window.location.reload()} />

    const isReadOnly = isDocumentLocked('GRN', grn.status as DocumentStatus)

    const handleScan = (barcode: string) => {
        if (isReadOnly) return
        const item = items?.find(i => i.code === barcode || i.id === barcode || i.barcode === barcode)

        if (!item) {
            setScanStatus("error")
            setStatusMessage(t("invalid_barcode"))
            setTimeout(() => setScanStatus("idle"), 3000)
            throw new Error('ItemNotFound')
        }

        const existingLine = grn.items.find(li => li.itemId === item.id)

        if (existingLine) {
            const itemLines = grn.items.filter(li => li.itemId === item.id)

            if (itemLines.length === 1) {
                const line = itemLines[0]
                const nextQty = line.receivedQuantity + 1
                updateLine.mutate({
                    grnId: id,
                    item: {
                        ...line,
                        receivedQuantity: nextQty
                    }
                }, {
                    onSuccess: () => {
                        playSound('success')
                        setScanStatus("success")
                        setStatusMessage(`${item.name}: ${nextQty}`)

                        setIsDirtyScanSession(true)

                        setTimeout(() => {
                            setScanStatus("idle")
                            setStatusMessage("")
                        }, 2000)
                    }
                })
            } else {
                setPendingItem({ id: item.id, name: item.name, barcode })
                setLotModalOpen(true)
            }
        } else {
            setPendingItem({ id: item.id, name: item.name, barcode })
            setLotModalOpen(true)
        }
    }

    const handleLotConfirm = (values: { lotNumber: string; expiryDate: Date; receivedQuantity: number }) => {
        if (isReadOnly || !pendingItem) return

        updateLine.mutate({
            grnId: id,
            item: {
                itemId: pendingItem.id,
                lotNumber: values.lotNumber,
                expiryDate: values.expiryDate.toISOString(),
                receivedQuantity: values.receivedQuantity,
                orderedQuantity: 0,
                poLineItemId: "manual-link",
            }
        }, {
            onSuccess: () => {
                playSound('success')
                setScanStatus("success")
                setStatusMessage(`${pendingItem.name} [${values.lotNumber}]`)
                setIsDirtyScanSession(true)
                setLotModalOpen(false)
                setPendingItem(null)

                setTimeout(() => {
                    setScanStatus("idle")
                    setStatusMessage("")
                }, 2000)
            },
            onError: () => {
                playSound('error')
                toast.error(common("error"))
            }
        })
    }

    return (
        <div className="min-w-0 gap-6 flex-1 flex-col flex pb-20 space-y-6 w-full">
            <PageHeader
                title={t("scan_mode")}
                subtitle={grn.grnNumber || id}
                backHref={`/goods-received/${id}`}
            >
                <div className="flex items-center gap-3">
                    <StatusBadge status={grn.status} />
                    {isReadOnly && (
                        <Badge variant="outline" className="bg-status-warning/10 border-status-warning/20 text-status-warning font-semibold text-label-xs px-3 py-1 rounded-sm animate-fade-in">
                            {t("read_only_badge")}
                        </Badge>
                    )}
                    <Button
                        onClick={() => router.push(`/goods-received/${id}`, { skipGuard: true })}
                        className="rounded-sm font-semibold text-label-xs uppercase px-6 bg-operational-cyan hover:brightness-110 text-white shadow-xl shadow-operational-cyan/20 transition-all active:scale-95"
                    >
                        {isReadOnly ? t("back_to_detail") : t("finish_scanning")}
                    </Button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                <div className="lg:col-span-5 xl:col-span-4 space-y-6 w-full shrink-0 min-w-0">
                    <Card className="bg-card border border-border shadow-xl rounded-2xl flex flex-col min-h-[400px] w-full min-w-0 overflow-hidden">
                        <div className="h-1.5 w-full bg-operational-cyan shadow-[0_0_15px_var(--operational-cyan)]" />
                        <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-8 w-full min-w-0">
                            <div>
                                <div className="flex items-center gap-4 mb-6 min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-operational-cyan/10 flex items-center justify-center text-operational-cyan shrink-0 shadow-inner">
                                        <PackageSearch className="w-6 h-6 text-operational-cyan" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-title-lg font-bold text-foreground tracking-tight truncate">{t("scan_mode")}</h3>
                                        <p className="text-label-sm text-muted-foreground/70 truncate">{t("scan_mode_sub")}</p>
                                    </div>
                                </div>

                                {isReadOnly ? (
                                    <div className="bg-status-warning/10 border border-status-warning/20 rounded-xl p-6 text-center space-y-3 animate-fade-in">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-status-warning/20 mb-2">
                                            <PackageSearch className="w-6 h-6 text-status-warning" />
                                        </div>
                                        <h4 className="text-body-md font-bold text-status-warning uppercase tracking-wider">
                                            {t("read_only_scan_registry")}
                                        </h4>
                                        <p className="text-label-xs text-status-warning/80 leading-relaxed max-w-2xl mx-auto">
                                            {t("scan_registry_locked_desc")}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 w-full min-w-0">
                                        <ScanInput
                                            onScan={handleScan}
                                            items={items || []}
                                            scanStatus={scanStatus}
                                            statusMessage={statusMessage}
                                            isScanning={updateLine.isPending}
                                            placeholder={t("scan_placeholder")}
                                            scannerMode={true}
                                            variant="retro"
                                            label={t("scan_placeholder")}
                                            className="w-full min-w-0"
                                        />
                                    </div>
                                )}
                            </div>

                            {!isReadOnly && (
                                <div className="pt-6 border-t border-border flex items-center justify-between text-label-xs font-bold text-muted-foreground/50 uppercase tracking-wider min-w-0">
                                    <span className="truncate pr-2">{t("awaiting_hardware")}</span>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-[0_0_8px_#10b981]" />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-7 xl:col-span-8 space-y-4 flex-1 w-full min-w-0">
                    <Card className="overflow-hidden bg-card border border-border shadow-xl rounded-2xl min-w-0">
                        <div className="bg-surface-container-low px-6 py-4 border-b border-border flex items-center justify-between min-w-0">
                            <h4 className="text-label-sm font-bold uppercase tracking-wider text-foreground truncate pr-2">
                                {t("scanned_manifest")}
                            </h4>
                            <Badge className="bg-operational-cyan/10 text-operational-cyan border-none font-bold text-label-xs px-3 py-1 rounded-lg shrink-0">
                                {grn.items?.length ?? 0} {common("items").toUpperCase()}
                            </Badge>
                        </div>
                        <Table>
                            <TableHeader className="bg-card/[0.02]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8">{common("item")}</TableHead>
                                    <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12">{t("lot_number")}</TableHead>
                                    <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t("receiving_qty")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(grn.items || []).map((item, index) => {
                                    const masterItem = items?.find(i => i.id === item.itemId)
                                    return (
                                        <TableRow key={`${item.itemId}-${item.lotNumber}-${index}`} className="hover:bg-card/[0.01] transition-colors border-none group">
                                            <TableCell className="px-8 py-5">
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="font-semibold text-body-md text-foreground group-hover:text-operational-cyan transition-colors truncate">
                                                        {masterItem ? masterItem.name : item.itemId}
                                                    </span>
                                                    <span className="text-label-xs font-mono text-muted-foreground/40 truncate" dir="ltr">{masterItem?.code || item.itemId}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className="text-label-sm font-mono font-semibold text-muted-foreground/60 truncate" dir="ltr">{item.lotNumber}</span>
                                                    <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase truncate" dir="ltr">
                                                        {formatDate(item.expiryDate, locale)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-operational-cyan/10 text-operational-cyan border-none font-mono font-semibold text-body-md px-3 py-0.5 rounded-lg">
                                                    {item.receivedQuantity}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {(grn.items || []).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground/40 min-w-0 my-8">
                                                <div className="w-12 h-12 rounded-2xl bg-operational-cyan/5 flex items-center justify-center text-operational-cyan/60 border border-operational-cyan/10">
                                                    <PackageSearch className="w-6 h-6" />
                                                </div>
                                                <span className="text-label-sm font-semibold uppercase tracking-wider italic">{t("no_records")}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>

            <LotEntryModal
                isOpen={lotModalOpen}
                onClose={() => {
                    setLotModalOpen(false)
                    setPendingItem(null)
                    setScanStatus("idle")
                }}
                onConfirm={handleLotConfirm}
                itemName={pendingItem?.name || ""}
                itemBarcode={pendingItem?.barcode || ""}
                isSubmitting={updateLine.isPending}
            />
        </div>
    )
}
