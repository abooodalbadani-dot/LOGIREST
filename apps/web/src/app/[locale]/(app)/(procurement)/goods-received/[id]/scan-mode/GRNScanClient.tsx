"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard"
import { useGoodsReceipt, useUpdateGRNLine } from "@/features/purchasing/api/useGoodsReceipts"
import { useItems } from "@/features/items/api/useItems"
import { PackageSearch } from "lucide-react"
import { toast } from "sonner"
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { isDocumentLocked, type DocumentStatus } from "@/core/workflow/document-engine"
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
  const { data: items, isLoading: isLoadingItems, error: errorItems } = useItems()
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
      return
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
            setStatusMessage(`${locale === 'ar' ? item.name_ar : item.name_en}: ${nextQty}`)
            
            setIsDirtyScanSession(true)
            
            setTimeout(() => {
              setScanStatus("idle")
              setStatusMessage("")
            }, 2000)
          }
        })
      } else {
        setPendingItem({ id: item.id, name: locale === 'ar' ? item.name_ar : item.name_en, barcode })
        setLotModalOpen(true)
      }
    } else {
      setPendingItem({ id: item.id, name: locale === 'ar' ? item.name_ar : item.name_en, barcode })
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
    <div className="space-y-6 pb-20">
      <PageHeader
        title={t("scan_mode")}
        subtitle={grn.grnNumber}
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
            className="rounded-sm font-semibold text-label-xs uppercase px-6"
          >
            {isReadOnly ? t("back_to_detail") : t("finish_scanning")}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-sm flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full max-w-sm space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-primary/10 mb-4 animate-scale-in">
                  <PackageSearch className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-title-lg font-semibold">{t("scan_mode")}</h3>
                <p className="text-label-sm text-muted-foreground/60">{t("scan_mode_sub")}</p>
              </div>

              {isReadOnly ? (
                <div className="bg-status-warning/10 border border-status-warning/20 rounded-sm p-6 text-center space-y-3 animate-fade-in">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-sm bg-status-warning/20 mb-2">
                    <PackageSearch className="w-6 h-6 text-status-warning" />
                  </div>
                  <h4 className="text-body-md font-bold text-status-warning uppercase tracking-wider">
                    {t("read_only_scan_registry")}
                  </h4>
                  <p className="text-label-xs text-status-warning/80 leading-relaxed max-w-xs mx-auto">
                    {t("scan_registry_locked_desc")}
                  </p>
                </div>
              ) : (
                <ScanInput
                  onScan={handleScan}
                  items={items || []}
                  scanStatus={scanStatus}
                  statusMessage={statusMessage}
                  isScanning={updateLine.isPending}
                  placeholder={t("scan_placeholder")}
                  scannerMode={true}
                />
              )}

              {!isReadOnly && (
                <div className="pt-4 border-t border-white/5 animate-fade-in">
                  <p className="text-label-xs font-semibold text-muted-foreground/30 uppercase text-center">
                    {t("awaiting_hardware")}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-label-xs font-semibold uppercase text-muted-foreground/40">
              {t("scanned_manifest")}
            </h4>
            <Badge variant="outline" className="bg-white/5 border-none font-semibold text-label-xs">
              {grn.items.length} {common("items").toUpperCase()}
            </Badge>
          </div>

          <Card className="overflow-hidden bg-surface-container-lowest border-none shadow-none rounded-sm">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8">{common("item")}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12">{t("lot_number")}</TableHead>
                  <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t("receiving_qty")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.items.map((item, index) => {
                  const masterItem = items?.find(i => i.id === item.itemId)
                  return (
                    <TableRow key={`${item.itemId}-${item.lotNumber}-${index}`} className="hover:bg-white/[0.01] transition-colors border-none group">
                      <TableCell className="px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-body-md text-foreground group-hover:text-primary transition-colors">
                            {masterItem ? (locale === 'ar' ? masterItem.name_ar : masterItem.name_en) : item.itemId}
                          </span>
                          <span className="text-label-xs font-mono text-muted-foreground/40" dir="ltr">{masterItem?.code || item.itemId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-label-sm font-mono font-semibold text-muted-foreground/60" dir="ltr">{item.lotNumber}</span>
                          <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase" dir="ltr">
                            {formatDate(item.expiryDate, locale)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-primary/10 text-primary border-none font-mono font-semibold text-body-md px-3 py-0.5">
                          {item.receivedQuantity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {grn.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                        <PackageSearch className="w-8 h-8 opacity-20" />
                        <span className="text-label-sm font-semibold uppercase italic">{t("no_records")}</span>
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
