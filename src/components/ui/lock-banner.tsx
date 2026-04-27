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
    <div className="w-full bg-amber-500/20 border-y sm:border sm:rounded-lg border-amber-500/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex shrink-0 items-center justify-center h-10 w-10 rounded-full bg-amber-500/20 text-amber-500">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-amber-500 tracking-wide uppercase text-sm">
            {t("warehouseLocked") || "Warehouse Locked"}
          </span>
          <span className="text-amber-500/80 text-xs sm:text-sm">
            {message || t("stocktakeInProgressDesc") || "Transactions are restricted due to an active stocktake."}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 opacity-80 animate-pulse text-amber-500 px-2">
        <AlertCircle className="h-5 w-5" />
      </div>
    </div>
  )
}
