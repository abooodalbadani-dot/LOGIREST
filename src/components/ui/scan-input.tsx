"use client"

import * as React from "react"
import { Input, InputProps } from "./input"
import { ScanLine, Loader2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ScanInputProps extends Omit<InputProps, "onScan" | "disabled"> {
  onScan: (barcode: string) => Promise<void> | void;
  isScanning?: boolean;
  scanStatus?: "idle" | "success" | "error";
  statusMessage?: string;
}

export function ScanInput({
  onScan,
  isScanning,
  scanStatus = "idle",
  statusMessage,
  className,
  ...props
}: ScanInputProps) {
  const [value, setValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        await onScan(value.trim())
        setValue("")
        // Keep focus for continuous scanning
        setTimeout(() => inputRef.current?.focus(), 10)
      }
    }
  }

  const [isRtl, setIsRtl] = React.useState(false)
  React.useEffect(() => {
    setTimeout(() => {
      setIsRtl(document.documentElement.dir === 'rtl')
    }, 0)
  }, [])

  return (
    <div className="flex flex-col space-y-2 w-full">
      <div className="relative flex items-center w-full">
        <div className={cn("absolute flex items-center justify-center", isRtl ? "right-3" : "left-3")}>
          {isScanning ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />
          ) : scanStatus === "success" ? (
            <Check className="h-4 w-4 text-brand-primary drop-shadow-[0_0_5px_rgba(58,190,255,0.8)]" />
          ) : scanStatus === "error" ? (
            <X className="h-4 w-4 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
          ) : (
            <ScanLine className="h-4 w-4 text-muted-foreground animate-pulse" />
          )}
        </div>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isScanning}
          placeholder="Scan barcode..."
          className={cn(
            isRtl ? "pr-10" : "pl-10",
            scanStatus === "error" && "border-red-500 focus-visible:ring-red-500 text-red-500",
            scanStatus === "success" && "border-brand-primary focus-visible:ring-brand-primary text-brand-primary",
            className
          )}
          {...props}
        />
      </div>
      {statusMessage && (
        <span className={cn(
          "text-xs px-1",
          scanStatus === "error" ? "text-red-500" : 
          scanStatus === "success" ? "text-brand-primary" : 
          "text-muted-foreground"
        )}>
          {statusMessage}
        </span>
      )}
    </div>
  )
}
