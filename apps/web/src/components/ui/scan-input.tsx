"use client"

import * as React from "react"
import { Input, InputProps } from "./input"
import { ScanLine, Loader2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('common');
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

  return (
    <div className="flex flex-col space-y-2 w-full">
      <div className="relative flex items-center w-full">
        <div className="absolute start-3 flex items-center justify-center">
          {isScanning ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : scanStatus === "success" ? (
            <Check className="h-4 w-4 text-status-success drop-shadow-[0_0_5px_rgba(var(--status-success-rgb),0.4)]" />
          ) : scanStatus === "error" ? (
            <X className="h-4 w-4 text-status-error drop-shadow-[0_0_5px_rgba(var(--status-error-rgb),0.4)]" />
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
          placeholder={props.placeholder || t('ui.scan_barcode')}
          className={cn(
 "ps-10",
 scanStatus === "error" && "bg-destructive/10 text-status-error focus-visible:bg-destructive/20",
 scanStatus === "success" && "bg-status-success/10 text-status-success focus-visible:bg-status-success/20",
 className
 )}
 {...props}
 />
 </div>
 {statusMessage && (
 <span className={cn(
 "text-label-sm px-1",
 scanStatus === "error" ? "text-status-error" : 
 scanStatus === "success" ? "text-status-success" : 
 "text-muted-foreground"
 )}>
 {statusMessage}
 </span>
 )}
 </div>
 )
}
