import React from 'react';
import { format } from 'date-fns';
import { getDocumentTitle } from '@logirest/shared-types';

export interface PDFColumn {
  header: string;
  key: string;
  width?: number;
}

interface PrintableReportProps {
  columns: PDFColumn[];
  rows: Record<string, unknown>[];
  title: string;
  options?: {
    scope?: string;
    generatedBy?: string;
  };
  branding?: {
    name?: string | null;
    logo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    taxNumber?: string | null;
    commercialRegistration?: string | null;
  };
  brandingConfig?: {
    logoUrl?: string;
    logoType: 'MARK' | 'BANNER';
    systemName?: string;
    logoSvgContent?: string;
  };
  lang?: 'en' | 'ar';
}

const dictionary: Record<string, Record<string, string>> = {
  ar: {
    'ITEM NAME': 'اسم الصنف',
    'CATEGORY': 'الفئة',
    'SKU': 'كود الصنف',
    'PHYSICAL QTY': 'الكمية الفعلية',
    'AVAILABLE': 'المتاح',
    'RESERVED': 'المحجوز',
    'UNIT': 'الوحدة',
    'PRICE': 'السعر',
    'TOTAL': 'الإجمالي',
    'DATE': 'التاريخ',
    'STATUS': 'الحالة',
    'BRANCH': 'الفرع',
    'WAREHOUSE': 'المستودع',
    'NOTES': 'ملاحظات',
  },
  en: {
    'اسم الصنف': 'ITEM NAME',
    'الفئة': 'CATEGORY',
    'كود الصنف': 'SKU',
    'الكمية الفعلية': 'PHYSICAL QTY',
    'المتاح': 'AVAILABLE',
    'المحجوز': 'RESERVED',
    'الوحدة': 'UNIT',
    'السعر': 'PRICE',
    'الإجمالي': 'TOTAL',
    'التاريخ': 'DATE',
    'الحالة': 'STATUS',
    'الفرع': 'BRANCH',
    'المستودع': 'WAREHOUSE',
    'ملاحظات': 'NOTES',
  }
};


const formatReportValue = (colKey: string, val: unknown, lang: 'ar' | 'en') => {
  if (val === null || val === undefined) return '';

  if (typeof val === 'boolean') {
    const key = colKey.toLowerCase();
    if (key.includes('active') || key.includes('status')) {
      return lang === 'ar' ? (val ? 'نشط' : 'غير نشط') : (val ? 'Active' : 'Inactive');
    }
    return lang === 'ar' ? (val ? 'نعم' : 'لا') : (val ? 'Yes' : 'No');
  }

  // Relational/nested object safety net: Drill down into objects before formatting
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;

    // Check if it's an Item-like object (code/sku and name)
    if ('name' in obj && ('sku' in obj || 'code' in obj || 'barcode' in obj)) {
      const code = (obj.sku || obj.code || obj.barcode || '') as string;
      const name = (obj.name || '') as string;
      return code ? `${code} - ${name}` : name;
    }

    // Check if it's a User-like object
    if ('fullName' in obj || 'name' in obj || 'email' in obj) {
      return (obj.fullName || obj.name || obj.email || '') as string;
    }

    // Check if it's a Warehouse/Branch/Supplier/etc. (name)
    if ('name' in obj) {
      return (obj.name || '') as string;
    }

    // Fallback: If it's a generic object but has an id
    if ('id' in obj) {
      const idVal = String(obj.id);
      return idVal.length > 8 ? idVal.substring(0, 8).toUpperCase() : idVal;
    }
  }

  const valStr = String(val).trim();
  if (!valStr) return '';

  // 1. Intercept and Format Dates:
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (isoDateRegex.test(valStr)) {
    try {
      const date = new Date(valStr);
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch {
      return valStr;
    }
  }

  // 2. Translate and Format Enums (for STATUS and TYPE columns)
  const colKeyUpper = colKey.toUpperCase();
  if (colKeyUpper.includes('STATUS') || colKeyUpper.includes('TYPE')) {
    const valUpper = valStr.toUpperCase();
    const exportTypeMap: Record<string, string> = {
      'GOODS_RECEIVED_NOTE': lang === 'ar' ? 'استلام بضاعة' : 'Goods Received Note',
      'ADJUSTMENT': lang === 'ar' ? 'تسوية مخزون' : 'Adjustment',
      'TRANSFER': lang === 'ar' ? 'تحويل مخزني' : 'Transfer',
      'INVENTORY_ISSUE': lang === 'ar' ? 'صرف مخزني' : 'Inventory Issue',
      'NEAR_EXPIRY': lang === 'ar' ? 'قارب على الانتهاء' : 'Near Expiry',
      'ACTIVE': lang === 'ar' ? 'نشط' : 'Active',
      'INACTIVE': lang === 'ar' ? 'غير نشط' : 'Inactive',
      'DRAFT': lang === 'ar' ? 'مسودة' : 'Draft',
      'SUBMITTED': lang === 'ar' ? 'تم التقديم' : 'Submitted',
      'APPROVED': lang === 'ar' ? 'تمت الموافقة' : 'Approved',
      'REJECTED': lang === 'ar' ? 'مرفوض' : 'Rejected',
      'FULFILLED': lang === 'ar' ? 'مكتمل' : 'Fulfilled'
    };

    if (exportTypeMap[valUpper]) {
      return exportTypeMap[valUpper];
    }
  }

  // 3. Truncate UUIDs:
  if (colKeyUpper.includes('REFERENCE') || colKeyUpper.includes('REF') || colKeyUpper.includes('DOCUMENT_NUMBER') || colKeyUpper.includes('ID')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(valStr)) {
      return valStr.substring(0, 8).toUpperCase();
    }
  }

  return valStr;
};

export const PrintableReport: React.FC<PrintableReportProps> = ({
  columns,
  rows,
  title,
  options,
  branding,
  brandingConfig,
  lang = 'ar',
}) => {
  const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm');

  const isEnglishText = (text: string) => !/[\u0600-\u06FF\uFE70-\uFEFC]/.test(text) && text.trim().length > 0;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hasValidScope = options?.scope && !uuidRegex.test(options.scope);

  const t = (key: string) => {
    const safeKey = key.trim();
    if (dictionary[lang] && dictionary[lang][safeKey]) return dictionary[lang][safeKey];
    if (dictionary[lang] && dictionary[lang][safeKey.toUpperCase()]) return dictionary[lang][safeKey.toUpperCase()];
    return safeKey;
  };

  const displayTitle = getDocumentTitle(title, lang) || title || (lang === 'ar' ? 'تقرير' : 'REPORT');

  const labels = {
    phone: lang === 'ar' ? 'هاتف' : 'Tel',
    email: lang === 'ar' ? 'بريد' : 'Email',
    tax: lang === 'ar' ? 'الرقم الضريبي' : 'Tax No',
    cr: lang === 'ar' ? 'سجل تجاري' : 'CR',
    date: lang === 'ar' ? 'تاريخ التقرير' : 'Date',
    scope: lang === 'ar' ? 'النطاق' : 'Scope',
    generatedBy: lang === 'ar' ? 'تم الإنشاء بواسطة' : 'Generated by',
    internalDoc: lang === 'ar' ? 'وثيقة داخلية' : 'Internal Document'
  };

  const src = brandingConfig?.logoUrl || branding?.logo || "/logo.svg";
  const type = brandingConfig?.logoType || 'MARK';

  // Patching backend typo if present in database configuration
  let sysName = brandingConfig?.systemName !== undefined ? brandingConfig.systemName : (branding?.name || 'Otantik Restaurant Enterprise');
  if (typeof sysName === 'string') {
    sysName = sysName.replace(/Restuarant/gi, 'Restaurant');
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{
        width: '210mm', // A4 width
        height: 'fit-content', // Only wrap actual content, prevent blank overflow
        padding: '15mm 15mm 20mm 15mm', // Optimized margins: left/right at 15mm, top at 15mm, bottom at 20mm
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden' // Ensure nothing leaks out of the A4 boundaries
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          @media print {
            @page {
              size: A4 portrait !important;
              margin: 10mm !important;
            }
            body {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              width: 210mm !important;
              height: auto !important;
              overflow: visible !important;
            }
          }
          
          .printable-report-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 5mm;
          }
          .printable-report-table th {
            padding: 8px;
            text-align: ${lang === 'ar' ? 'right' : 'left'};
            font-size: 10pt;
            font-weight: 700;
            border-bottom: 2px solid #c4a98d;
            background-color: #0B1220;
            color: #ffffff;
          }
          .printable-report-table td {
            padding: 8px;
            text-align: ${lang === 'ar' ? 'right' : 'left'};
            font-size: 9pt;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
          }
          .printable-report-table tr:nth-child(even) td {
            background-color: rgba(180, 142, 103, 0.1);
          }
          .printable-report-table tr:nth-child(odd) td {
            background-color: #ffffff;
          }
          
          /* Enforce SVG containment for raw injections */
          .report-svg-mark svg, .report-svg-banner svg {
            width: 100% !important;
            height: 100% !important;
            display: block;
          }
        `}
      </style>

      {/* UNIFIED HEADER ARCHITECTURE */}
      <header style={{ width: '100%', marginBottom: '10mm', display: 'flex', flexDirection: 'column' }}>
        {/* TOP ROW: Identity (Left) & Report Info (Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '6mm', flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>

          {/* LEFT QUADRANT: Dynamic Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>
            {type === 'BANNER' ? (
              brandingConfig?.logoSvgContent ? (
                <div
                  className="report-svg-banner"
                  style={{ width: '80mm', height: '24mm', display: 'flex', alignItems: 'center', justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start', overflow: 'visible', flexShrink: 0 }}
                  dangerouslySetInnerHTML={{ __html: brandingConfig.logoSvgContent }}
                />
              ) : (
                <div style={{ width: '80mm', height: '24mm', display: 'flex', alignItems: 'center', justifyContent: lang === 'ar' ? 'flex-end' : 'flex-start', overflow: 'visible', flexShrink: 0 }}>
                  <img
                    src={src}
                    {...(src.startsWith('data:') ? {} : { crossOrigin: "anonymous" })}
                    style={{ width: '80mm', height: 'auto', maxHeight: '24mm', objectFit: 'contain', objectPosition: lang === 'ar' ? 'right center' : 'left center' }}
                    alt="Logo"
                  />
                </div>
              )
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>
                {brandingConfig?.logoSvgContent ? (
                  <div
                    className="report-svg-mark"
                    style={{ width: '22mm', height: '22mm', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', flexShrink: 0 }}
                    dangerouslySetInnerHTML={{ __html: brandingConfig.logoSvgContent }}
                  />
                ) : (
                  <div style={{ width: '22mm', height: '22mm', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img
                      src={src}
                      {...(src.startsWith('data:') ? {} : { crossOrigin: "anonymous" })}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      alt="Logo"
                    />
                  </div>
                )}
                <h1 style={{ margin: 0, fontSize: '18pt', fontWeight: 900, color: '#0B1220', letterSpacing: '-0.025em' }}>
                  {sysName}
                </h1>
              </div>
            )}
          </div>

          {/* RIGHT QUADRANT: Report Title & Date (ALWAYS HERE) */}
          <div style={{ textAlign: lang === 'ar' ? 'left' : 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: 700, color: '#0B1220', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{displayTitle}</h2>
            <span style={{ fontSize: '9pt', color: '#64748b', marginTop: '4px' }}>{labels.date}: {dateStr}</span>
            {hasValidScope && <span style={{ fontSize: '9pt', color: '#64748b', marginTop: '2px' }}>{labels.scope}: {options.scope}</span>}
          </div>
        </div>

        {/* BOTTOM ROW: The Global Metadata Strip (ALWAYS HERE) */}
        <div style={{
          display: 'flex',
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderTop: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          padding: '8px 0',
          fontSize: '9px',
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          flexDirection: lang === 'ar' ? 'row-reverse' : 'row',
          marginTop: '16px'
        }}>
          {/* Left Side: Name & Address (Constrained Width) */}
          <div style={{
            width: '60%',
            paddingRight: lang === 'en' ? '16px' : '0',
            paddingLeft: lang === 'ar' ? '16px' : '0',
            lineHeight: '1.625',
            textAlign: lang === 'ar' ? 'right' : 'left'
          }}>
            <span
              dir={isEnglishText(sysName) ? "ltr" : undefined}
              style={{
                fontWeight: 600,
                color: '#6b7280',
                display: isEnglishText(sysName) ? 'inline-block' : 'inline'
              }}
            >
              {sysName}
            </span>
            {branding?.address && (
              <>
                {" - "}
                <span
                  dir={isEnglishText(branding.address) ? "ltr" : undefined}
                  style={{
                    display: isEnglishText(branding.address) ? 'inline-block' : 'inline'
                  }}
                >
                  {branding.address}
                </span>
              </>
            )}
          </div>

          {/* Right Side: Legal & Contact (Right Aligned) */}
          <div style={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: lang === 'ar' ? 'flex-start' : 'flex-end',
            gap: '4px',
            borderLeft: lang === 'en' ? '1px solid #e5e7eb' : 'none',
            borderRight: lang === 'ar' ? '1px solid #e5e7eb' : 'none',
            paddingLeft: lang === 'en' ? '16px' : '0',
            paddingRight: lang === 'ar' ? '16px' : '0',
            textAlign: lang === 'ar' ? 'left' : 'right'
          }}>
            {branding?.phone && <span style={{ whiteSpace: 'nowrap' }}>{labels.phone}: {branding.phone}</span>}
            {(branding?.taxNumber || branding?.commercialRegistration) && (
              <span style={{ whiteSpace: 'nowrap' }}>
                {branding?.taxNumber ? `${labels.tax}: ${branding.taxNumber}` : ''}
                {branding?.taxNumber && branding?.commercialRegistration ? ' | ' : ''}
                {branding?.commercialRegistration ? `${labels.cr}: ${branding.commercialRegistration}` : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Table Content */}
      <table className="printable-report-table">
        <thead>
          <tr>
            {columns.map((col, idx) => {
              const colWidth = col.width ? `${col.width}%` : undefined;
              const colKeyUpper = col.key.toUpperCase();

              // Determine if this is compact/structured data that should be centered
              const isCentered =
                colKeyUpper.includes('DATE') ||
                colKeyUpper.includes('EXPIRY') ||
                colKeyUpper.includes('QTY') ||
                colKeyUpper.includes('QUANTITY') ||
                colKeyUpper.includes('VARIANCE') ||
                colKeyUpper.includes('REFERENCE') ||
                colKeyUpper.includes('REF') ||
                colKeyUpper.includes('DOCUMENT_NUMBER') ||
                colKeyUpper.includes('PONO') ||
                colKeyUpper.includes('SKU') ||
                colKeyUpper.includes('LOT') ||
                colKeyUpper.includes('ID') ||
                colKeyUpper.includes('STATUS') ||
                colKeyUpper.includes('TYPE');

              const headerAlign = isCentered ? 'center' : (lang === 'ar' ? 'right' : 'left');

              return (
                <th
                  key={idx}
                  style={{
                    width: colWidth,
                    minWidth: colWidth,
                    textAlign: headerAlign,
                    backgroundColor: '#0B1220',
                    color: '#ffffff',
                    padding: '8px',
                    fontSize: '10pt',
                    fontWeight: 700,
                    borderBottom: '2px solid #c4a98d'
                  }}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {columns.map((col, cIdx) => {
                const val = row[col.key];
                let displayVal = formatReportValue(col.key, val, lang);

                // Truncate raw UUIDs
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(displayVal)) {
                  displayVal = displayVal.substring(0, 8).toUpperCase();
                }

                // Identify type/language logic
                const isNumeric = /^\d+(\.\d+)?%?$/.test(displayVal.trim());
                const isEnglish = !/[\u0600-\u06FF\uFE70-\uFEFC]/.test(displayVal) && displayVal.trim().length > 0;

                const colKeyUpper = col.key.toUpperCase();
                const isCentered =
                  colKeyUpper.includes('DATE') ||
                  colKeyUpper.includes('EXPIRY') ||
                  colKeyUpper.includes('QTY') ||
                  colKeyUpper.includes('QUANTITY') ||
                  colKeyUpper.includes('VARIANCE') ||
                  colKeyUpper.includes('REFERENCE') ||
                  colKeyUpper.includes('REF') ||
                  colKeyUpper.includes('DOCUMENT_NUMBER') ||
                  colKeyUpper.includes('PONO') ||
                  colKeyUpper.includes('SKU') ||
                  colKeyUpper.includes('LOT') ||
                  colKeyUpper.includes('ID') ||
                  colKeyUpper.includes('STATUS') ||
                  colKeyUpper.includes('TYPE');

                let alignStyle: 'right' | 'left' | 'center' = lang === 'ar' ? 'right' : 'left';
                let dirStyle: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';
                let fontStyle = 'inherit';
                let fontVariant = 'normal';

                if (isCentered) {
                  alignStyle = 'center';
                  dirStyle = isEnglish || isNumeric ? 'ltr' : (lang === 'ar' ? 'rtl' : 'ltr');
                } else if (isNumeric) {
                  alignStyle = 'center';
                  dirStyle = 'ltr';
                  fontVariant = 'tabular-nums';
                } else if (isEnglish) {
                  alignStyle = 'left';
                  dirStyle = 'ltr';
                  fontStyle = 'monospace';
                } else {
                  alignStyle = 'right';
                  dirStyle = 'rtl';
                }

                const colWidth = col.width ? `${col.width}%` : undefined;

                // CHINA Badge override
                if (displayVal.toLowerCase() === 'china') {
                  return (
                    <td key={cIdx} style={{ textAlign: alignStyle, direction: dirStyle, padding: '8px', width: colWidth, minWidth: colWidth }}>
                      <span className="px-3 py-1 bg-gray-100 text-[#0B1220] text-xs font-bold uppercase tracking-wider rounded-md" dir="ltr">
                        CHINA
                      </span>
                    </td>
                  );
                }

                return (
                  <td
                    key={cIdx}
                    style={{
                      textAlign: alignStyle,
                      direction: dirStyle,
                      fontFamily: fontStyle,
                      fontVariantNumeric: fontVariant,
                      padding: '8px',
                      width: colWidth,
                      minWidth: colWidth
                    }}
                  >
                    {displayVal}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: '10mm', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '5mm', color: '#94a3b8', fontSize: '8.5pt' }}>
        <span style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
          {options?.generatedBy ? `${labels.generatedBy}: ${options.generatedBy}` : ''}
          {options?.generatedBy && hasValidScope ? ' | ' : ''}
          {hasValidScope ? `${labels.scope}: ${options.scope}` : ''}
        </span>
        <span style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>{labels.internalDoc}</span>
      </div>
    </div>
  );
};
