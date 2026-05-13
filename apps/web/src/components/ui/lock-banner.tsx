"use client"

import * as React from "react"
import { AlertCircle, Lock } from "lucide-react"
import { useTranslations } from "next-intl"

interface LockBannerProps {
 message?: string
}

export function LockBanner({ message }: LockBannerProps) {
 const t = useTranslations("common");

 return (
 <div className="w-full bg-status-warning/15 sm:rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <div className="flex shrink-0 items-center justify-center h-10 w-10 rounded-full bg-status-warning/20 text-status-warning">
 <Lock className="h-5 w-5" />
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-status-warning uppercase text-body-md">
 {t("warehouse_locked") || "Warehouse Locked"}
 </span>
 <span className="text-status-warning/80 text-label-sm sm:text-body-md">
 {message || t("stocktake_in_progress_desc") || "Transactions are restricted due to an active stocktake."}
 </span>
 </div>
 </div>
 <div className="flex shrink-0 opacity-80 animate-pulse text-status-warning px-2">
 <AlertCircle className="h-5 w-5" />
 </div>
 </div>
 )
}
