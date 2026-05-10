import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Re-export currency, quantity, and date formatters for centralized access.
 * All formatting MUST go through these utilities to ensure locale consistency.
 */
export { 
  formatCurrency, 
  formatQuantity, 
  formatNumber, 
  formatDate, 
  formatTime,
  formatRate,
  convertToBase
} from "@/utils/currency";
