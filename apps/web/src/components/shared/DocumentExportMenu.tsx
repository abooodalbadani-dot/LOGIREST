'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Download, FileText, Table, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { getTokenCookie } from '@/lib/api/cookies';
import { attemptRefresh } from '@/lib/api/client';

const BASE = (typeof window === 'undefined' ? process.env.API_URL : null) ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface DocumentExportMenuProps {
 documentType: 'PO' | 'TRANSFER' | 'PR' | 'GRN' | 'ADJUSTMENT' | 'STOCKTAKE' | 'ISSUE';
 documentId?: string;
 documentNumber?: string;
}

export function DocumentExportMenu({ documentType, documentId, documentNumber }: DocumentExportMenuProps) {
 const t = useTranslations('common');
 const locale = useLocale() as 'ar' | 'en';
 const [isExporting, setIsExporting] = useState(false);

 const handleExportPDF = async () => {
  if (!documentId) {
   toast.error(locale === 'ar' ? 'معرف المستند غير صالح' : 'Invalid document ID');
   return;
  }

  setIsExporting(true);

  try {
   let token = getTokenCookie();
   if (!token) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
     token = getTokenCookie();
    }
   }

   const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
   };

   // Inject scope headers from localStorage if available
   try {
    const storedScope = localStorage.getItem('logirest_active_scope');
    if (storedScope) {
     const scope = JSON.parse(storedScope);
     if (scope.branchId) headers['x-branch-id'] = scope.branchId;
     if (scope.warehouseId) headers['x-warehouse-id'] = scope.warehouseId;
    }
   } catch (e) {
    console.error('Failed to parse scope from localStorage', e);
   }

   let endpoint = '';
   switch (documentType) {
    case 'PO':
     endpoint = `/procurement/purchase-orders/${documentId}/pdf?locale=${locale}`;
     break;
    case 'TRANSFER':
     endpoint = `/operations/transfers/${documentId}/pdf?locale=${locale}`;
     break;
    case 'GRN':
     endpoint = `/procurement/grns/${documentId}/pdf?locale=${locale}`;
     break;
    case 'ADJUSTMENT':
     endpoint = `/operations/adjustments/${documentId}/pdf?locale=${locale}`;
     break;
    case 'STOCKTAKE':
     endpoint = `/stocktake/sessions/${documentId}/pdf?locale=${locale}`;
     break;
    case 'PR':
     endpoint = `/procurement/purchase-requests/${documentId}/pdf?locale=${locale}`;
     break;
    case 'ISSUE':
     endpoint = `/operations/issues/${documentId}/pdf?locale=${locale}`;
     break;
    default:
     throw new Error(`Unsupported document type: ${documentType}`);
   }

   let response = await fetch(`${BASE}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
    headers,
   });

   if (response.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
     token = getTokenCookie();
     if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(`${BASE}${endpoint}`, {
       method: 'GET',
       credentials: 'include',
       headers,
      });
     }
    }
   }

   if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(errorText || 'Failed to fetch PDF');
   }

   const blob = await response.blob();
   const url = window.URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.setAttribute('download', `${documentType}_${documentNumber || documentId}.pdf`);
   document.body.appendChild(link);
   link.click();
   link.parentNode?.removeChild(link);
   window.URL.revokeObjectURL(url);

   toast.success(locale === 'ar' ? 'تم تصدير الملف بنجاح' : 'Document exported successfully');
  } catch (error) {
   console.error('Export failed:', error);
   toast.error(locale === 'ar' ? 'حدث خطأ أثناء تصدير الملف' : 'An error occurred during export');
  } finally {
   setIsExporting(false);
  }
 };

 const handleExportExcel = () => {
  toast.info(t('export_excel_coming_soon') || 'Excel export coming soon');
 };

 return (
  <DropdownMenu>
   <DropdownMenuTrigger asChild>
    <Button
     variant="outline"
     size="sm"
     disabled={isExporting}
     className="h-9 rounded-xl bg-surface-container-high border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
     {isExporting ? (
      <Loader2 className="w-4 h-4 me-2 animate-spin" />
     ) : (
      <Download className="w-4 h-4 me-2" />
     )}
     {isExporting ? (locale === 'ar' ? 'جاري التصدير...' : 'Exporting...') : t('export')}
    </Button>
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
     <FileText className="w-4 h-4 me-2 text-rose-500" />
     {t('export_pdf')}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
     <Table className="w-4 h-4 me-2 text-emerald-500" />
     {t('export_excel')}
    </DropdownMenuItem>
   </DropdownMenuContent>
  </DropdownMenu>
 );
}
