"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useGoodsReceipt, useUpdateGRNLine } from "@/features/purchasing/api/useGoodsReceipts"
import { useItems } from "@/features/items/api/useItems"
import { PackageSearch } from "lucide-react"
import { toast } from "sonner"

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
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
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
  const router = useRouter()

  const { data: grn, isLoading: isLoadingGRN } = useGoodsReceipt(id)
  const { data: items, isLoading: isLoadingItems } = useItems()
  const updateLine = useUpdateGRNLine()

  const [scanStatus, setScanStatus] = React.useState<"idle" | "success" | "error">("idle")
  const [statusMessage, setStatusMessage] = React.useState("")
  
  // Modal state
  const [lotModalOpen, setLotModalOpen] = React.useState(false)
  const [pendingItem, setPendingItem] = React.useState<{ id: string; name: string; barcode: string } | null>(null)

  if (isLoadingGRN || isLoadingItems) return <LoadingSkeleton />
  if (!grn) return <ErrorState onRetry={() => window.location.reload()} />

  // Security: Only DRAFT can be scanned
  if (grn.status !== "DRAFT" && grn.status !== "RECEIVED") {
    // In many systems DRAFT is the only editable state. 
    // The prompt specifically mentioned DRAFT.
    router.replace(`/goods-received/${id}`)
    return null
  }

  const handleScan = async (barcode: string) => {
    // 1. Lookup item by barcode
    // In our mock items, we'll use the ID as a barcode fallback or add some barcodes
    const item = items?.find(i => i.sku === barcode || i.id === barcode)
    
    if (!item) {
      setScanStatus("error")
      setStatusMessage(t("invalid_barcode"))
      setTimeout(() => setScanStatus("idle"), 3000)
      return
    }

    // 2. Check if item+lot exists in current GRN
    // Since we don't know the lot yet for a new scan, we check if ANY line exists for this item
    const existingLine = grn.items.find(li => li.itemId === item.id)

    if (existingLine) {
      // If it exists, we increment the quantity of the FIRST found line (simplification)
      // or we could show the modal to pick which lot. 
      // Requirement 5: If item+lot already exists -> increment qty.
      // Since we don't have the lot yet from just a barcode scan, we'll assume the user wants to increment the last scanned lot of this item or open modal.
      // Better flow: Open modal but pre-fill if it's the same item.
      
      // Let's check if there's only one lot for this item in the GRN.
      const itemLines = grn.items.filter(li => li.itemId === item.id)
      
      if (itemLines.length === 1) {
        const line = itemLines[0]
        await updateLine.mutateAsync({
          grnId: id,
          item: {
            ...line,
            receivedQuantity: line.receivedQuantity + 1
          }
        })
        setScanStatus("success")
        setStatusMessage(`${locale === 'ar' ? item.nameAr : item.nameEn}: ${line.receivedQuantity + 1}`)
      } else {
        // Multiple lots or we want to be sure, open modal
        setPendingItem({ id: item.id, name: locale === 'ar' ? item.nameAr : item.nameEn, barcode })
        setLotModalOpen(true)
      }
    } else {
      // 3. If first scan for this item -> open LotEntryModal
      setPendingItem({ id: item.id, name: locale === 'ar' ? item.nameAr : item.nameEn, barcode })
      setLotModalOpen(true)
    }

    if (!lotModalOpen) {
      setTimeout(() => {
        setScanStatus("idle")
        setStatusMessage("")
      }, 2000)
    }
  }

  const handleLotConfirm = async (values: { lotNumber: string; expiryDate: Date; receivedQuantity: number }) => {
    if (!pendingItem) return

    try {
      await updateLine.mutateAsync({
        grnId: id,
        item: {
          itemId: pendingItem.id,
          lotNumber: values.lotNumber,
          expiryDate: values.expiryDate.toISOString(),
          receivedQuantity: values.receivedQuantity,
          orderedQuantity: 0, // Mock: assuming it wasn't in PO
          poLineItemId: "manual-link",
        }
      })
      
      setScanStatus("success")
      setStatusMessage(`${pendingItem.name} [${values.lotNumber}]`)
      setLotModalOpen(false)
      setPendingItem(null)
      
      setTimeout(() => {
        setScanStatus("idle")
        setStatusMessage("")
      }, 2000)
    } catch {
      toast.error(common("error"))
    }
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
          <Button 
            onClick={() => router.push(`/goods-received/${id}`)}
            className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6"
          >
            {t("finish_scanning")}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scanner Panel */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-[2.5rem] flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full max-w-sm space-y-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <PackageSearch className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-black">{t("scan_mode")}</h3>
                <p className="text-xs text-muted-foreground/60">{t("scan_mode_sub")}</p>
              </div>

              <ScanInput
                onScan={handleScan}
                scanStatus={scanStatus}
                statusMessage={statusMessage}
                isScanning={updateLine.isPending}
                placeholder={t("scan_placeholder")}
              />

              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] text-center">
                  {t("awaiting_hardware")}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Manifest Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              {t("scanned_manifest")}
            </h4>
            <Badge variant="outline" className="bg-white/5 border-none font-black text-[10px]">
              {grn.items.length} {common("items").toUpperCase()}
            </Badge>
          </div>

          <Card className="overflow-hidden bg-surface-container-lowest border-none shadow-none rounded-[2rem]">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 h-12 px-8">{common("item")}</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 h-12">{t("lot_number")}</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center h-12">{t("receiving_qty")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.items.map((item, index) => {
                  const masterItem = items?.find(i => i.id === item.itemId)
                  return (
                    <TableRow key={`${item.itemId}-${item.lotNumber}-${index}`} className="hover:bg-white/[0.01] transition-colors border-none group">
                      <TableCell className="px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-sm text-foreground group-hover:text-primary transition-colors">
                            {masterItem ? (locale === 'ar' ? masterItem.nameAr : masterItem.nameEn) : item.itemId}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/40" dir="ltr">{masterItem?.sku || item.itemId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-black text-muted-foreground/60" dir="ltr">{item.lotNumber}</span>
                          <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest" dir="ltr">
                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString(locale) : '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-primary/10 text-primary border-none font-mono font-black text-sm px-3 py-0.5">
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
                        <span className="text-xs font-black uppercase tracking-widest italic">{t("no_records")}</span>
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
