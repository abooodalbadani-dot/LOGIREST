'use client';

import * as React from 'react';
import { getExportBranding } from '@/lib/export/exportBranding';

export interface ThermalLineItem {
 code: string;
 name: string;
 qty: number;
 uom: string;
 fulfilledQty?: number;
 notes?: string;
}

interface ThermalReceiptProps {
 docType: 'KITCHEN_REQUEST' | 'INVENTORY_ISSUE';
 docNumber: string;
 date: string | Date;
 operator: string;
 department?: string;
 warehouse: string;
 notes?: string;
 items: ThermalLineItem[];
 paperSize: '80mm' | '58mm';
 showLogo: boolean;
 onClose: () => void;
 locale?: 'ar' | 'en';
}

export function ThermalReceipt({
 docType,
 docNumber,
 date,
 operator,
 department,
 warehouse,
 notes,
 items,
 paperSize,
 showLogo,
 onClose,
 locale = 'ar',
}: ThermalReceiptProps) {
 const branding = getExportBranding();
 const isAr = locale === 'ar';

 const formattedDate = React.useMemo(() => {
  if (!date) return '';
  try {
   const d = typeof date === 'string' ? new Date(date) : date;
   return d.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
   });
  } catch {
   return String(date);
  }
 }, [date, locale]);

 // Handle asynchronous printing and automatic unmounting
 React.useEffect(() => {
  const timer = setTimeout(() => {
   window.print();
  }, 150); // Delay for painting

  const handleAfterPrint = () => {
   onClose();
  };

  window.addEventListener('afterprint', handleAfterPrint);

  return () => {
   clearTimeout(timer);
   window.removeEventListener('afterprint', handleAfterPrint);
  };
 }, [onClose]);

 // Labels
 const labels = {
  kitchenRequest: isAr ? 'طلب تحضير مطبخ' : 'KITCHEN REQUEST',
  inventoryIssue: isAr ? 'سند صرف مخزني' : 'INVENTORY ISSUE',
  docNum: isAr ? 'رقم السند:' : 'Doc No:',
  dateLabel: isAr ? 'التاريخ:' : 'Date:',
  operatorLabel: isAr ? 'المشغل:' : 'Operator:',
  departmentLabel: isAr ? 'القسم:' : 'Dept:',
  warehouseLabel: isAr ? 'المستودع:' : 'Store:',
  itemCol: isAr ? 'الصنف' : 'Item',
  qtyCol: isAr ? 'الكمية' : 'Qty',
  notes: isAr ? 'ملاحظات:' : 'Notes:',
  systemName: 'Otantik Restuarant',
 };

 const title = docType === 'KITCHEN_REQUEST' ? labels.kitchenRequest : labels.inventoryIssue;

 // Render dashed dividers
 const widthChars = paperSize === '58mm' ? 32 : 40;
 const divider = '-'.repeat(widthChars);

 return (
  <>
   {/* Print-specific style block overrides to force thermal layout sizes */}
   <style dangerouslySetInnerHTML={{
    __html: `
     @media print {
      @page {
       size: ${paperSize} auto;
       margin: 0;
      }
      body {
       margin: 0 !important;
       padding: 0 !important;
       width: ${paperSize} !important;
       background: white !important;
       color: black !important;
      }
      html, body {
       height: auto !important;
       overflow: visible !important;
      }
      /* Hide absolute everything except the receipt wrapper */
      body > * {
       display: none !important;
      }
      .thermal-receipt-root {
       display: block !important;
      }
     }
    `
   }} />

   {/* Wrapper component visible ONLY during browser print execution */}
   <div 
    className="thermal-receipt-root hidden print:block text-black bg-card font-mono leading-tight select-none"
    style={{
     width: paperSize,
     padding: '4mm',
     fontSize: paperSize === '58mm' ? '10px' : '12px',
     direction: isAr ? 'rtl' : 'ltr',
     boxSizing: 'border-box',
    }}
   >
    <div className="flex flex-col items-center text-center">
     {/* Logo Header */}
     {showLogo && branding?.logo && (
      <img
       src={branding.logo}
       alt="Logo"
       className="w-12 h-12 object-contain mb-2 inline-block filter grayscale invert-0"
       style={{ maxHeight: '45px', maxWidth: '45px' }}
      />
     )}

     {/* Restaurant Branding */}
     <h2 className="font-bold text-base" style={{ fontSize: paperSize === '58mm' ? '14px' : '16px' }}>
      {branding?.name || labels.systemName}
     </h2>
     {branding?.address && (
      <p className="text-[9px] opacity-80 mt-0.5">{branding.address}</p>
     )}
     {branding?.taxNumber && (
      <p className="text-[9px] opacity-80">الرقم الضريبي: {branding.taxNumber}</p>
     )}

     <div className="w-full my-1">{divider}</div>

     {/* Document Title */}
     <h3 className="font-bold uppercase tracking-wider" style={{ fontSize: paperSize === '58mm' ? '12px' : '14px' }}>
      {title}
     </h3>
     <p className="font-bold mt-1 text-sm">{docNumber}</p>
     
     <div className="w-full my-1">{divider}</div>
    </div>

    {/* Metadata Details Block */}
    <div className="space-y-1 my-2" style={{ fontSize: paperSize === '58mm' ? '9px' : '11px' }}>
     <div className="flex justify-between">
      <span className="font-bold">{labels.dateLabel}</span>
      <span>{formattedDate}</span>
     </div>
     <div className="flex justify-between">
      <span className="font-bold">{labels.operatorLabel}</span>
      <span>{operator}</span>
     </div>
     {department && (
      <div className="flex justify-between">
       <span className="font-bold">{labels.departmentLabel}</span>
       <span>{department}</span>
      </div>
     )}
     <div className="flex justify-between">
      <span className="font-bold">{labels.warehouseLabel}</span>
      <span>{warehouse}</span>
     </div>
    </div>

    <div className="w-full my-1">{divider}</div>

    {/* Line Items Table */}
    <table className="w-full text-start border-collapse my-2">
     <thead>
      <tr className="font-bold border-b border-black">
       <th className="py-1 text-start" style={{ width: '65%' }}>{labels.itemCol}</th>
       <th className="py-1 text-end" style={{ width: '35%' }}>{labels.qtyCol}</th>
      </tr>
     </thead>
     <tbody>
      {items.map((item, idx) => (
       <React.Fragment key={idx}>
        <tr className="align-top border-b border-black/10">
         <td className="py-1.5 text-start">
          <span className="font-bold block">{item.name}</span>
          <span className="text-[8px] opacity-60 block">{item.code}</span>
         </td>
         <td className="py-1.5 text-end font-bold whitespace-nowrap">
          {item.qty} {item.uom}
          {item.fulfilledQty !== undefined && item.fulfilledQty !== item.qty && (
           <span className="block text-[8px] opacity-80">
            {isAr ? 'المستلم:' : 'Rec:'} {item.fulfilledQty}
           </span>
          )}
         </td>
        </tr>
        {item.notes && (
         <tr>
          <td colSpan={2} className="py-0.5 pb-1.5 text-start text-[8px] italic opacity-85">
           * {item.notes}
          </td>
         </tr>
        )}
       </React.Fragment>
      ))}
     </tbody>
    </table>

    <div className="w-full my-1">{divider}</div>

    {/* Operational Notes */}
    {notes && (
     <div className="my-2 text-[9px] border border-black p-1.5 rounded-sm">
      <span className="font-bold block mb-0.5">{labels.notes}</span>
      <p className="italic">{notes}</p>
     </div>
    )}

    {/* Footer Audit Signature */}
    <div className="text-center mt-6 text-[8px] opacity-65 flex flex-col items-center">
     <p>{divider}</p>
     <p className="mt-1">{isAr ? 'نظام مطاعم أوتانتيك للمخازن' : 'Otantik Restuarant Inventory System'}</p>
     <p>www.logirest.app</p>
    </div>
   </div>
  </>
 );
}
