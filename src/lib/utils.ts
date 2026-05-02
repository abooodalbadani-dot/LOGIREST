import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency as currencyFormatter } from "@/utils/currency"

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

/**
 * Format a date for display.
 * Uses Western Arabic numerals (latn) for consistency in financial/inventory contexts.
 */
export function formatDate(date: string | Date | number, locale: "ar" | "en" = "en") {
 if (!date) return "---";
 const d = typeof date === "string" ? new Date(date) : date;
 const formatterLocale = locale === "ar" ? "ar-u-nu-latn" : "en-US";
 
 return new Intl.DateTimeFormat(formatterLocale, {
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 }).format(d);
}

/**
 * Re-export currency formatter for centralized access.
 */
export const formatCurrency = currencyFormatter;
