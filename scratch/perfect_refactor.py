import os

filepath = r"c:\kitchen-store-inventory-system\apps\web\src\components\shared\DocumentLineItemTable\DocumentLineItemTable.tsx"
with open(filepath, 'rb') as f:
    raw_content = f.read()

content = raw_content.decode('utf-8')

# 1. Update imports
import_target = "import { formatDate } from '@/utils/currency';"
import_replacement = "import { formatDate, formatQuantity } from '@/utils/currency';"
content = content.replace(import_target, import_replacement)

# 2. Update LineItem definition (make expiryDate optional inside lot)
lot_target = "  lot?: { lotNumber: string; expiryDate: string | null } | null;"
lot_replacement = "  lot?: { lotNumber: string; expiryDate?: string | null } | null;"
content = content.replace(lot_target, lot_replacement)

# 3. Define helper function renderAdjustmentMobileCard inside DocumentLineItemTable
locale_target = "  const locale = useLocale();"
helper_code = """  const locale = useLocale();

  const renderAdjustmentMobileCard = (line: T) => {
   const isUnitCostCol = (header: string) => header === 'Unit Cost' || header === 'تكلفة الوحدة' || header.toLowerCase().includes('cost') || header.includes('تكلفة');
   const isDirectionCol = (header: string) => header === 'Direction' || header === 'الاتجاه' || header.toLowerCase().includes('direction') || header.includes('اتجاه');
   const isBeforeCol = (header: string) => header === 'Qty Before' || header === 'قبل' || header.toLowerCase().includes('before') || header.includes('قبل');
   const isAfterCol = (header: string) => header === 'Qty After' || header === 'بعد التعديل' || header.toLowerCase().includes('after') || header.includes('بعد');
   const isLotCol = (header: string) => header === 'Lot' || header === 'الدفعة' || header === 'Lot Number' || header === 'رقم الدفعة' || header.toLowerCase().includes('lot') || header.includes('دفعة');

   const unitCostCol = extraColumns.find(c => isUnitCostCol(c.header));
   const directionCol = extraColumns.find(c => isDirectionCol(c.header));
   const beforeCol = extraColumns.find(c => isBeforeCol(c.header));
   const afterCol = extraColumns.find(c => isAfterCol(c.header));
   const lotCol = extraColumns.find(c => isLotCol(c.header));

   const matchedCols = [unitCostCol, directionCol, beforeCol, afterCol, lotCol].filter(Boolean);
   const remainingCols = extraColumns.filter(c => !matchedCols.includes(c));

   const isAdjustmentLine = (l: unknown): l is { direction: 'INCREASE' | 'DECREASE'; qtyBefore?: number; unitCost?: number | null } => {
    return typeof l === 'object' && l !== null && 'direction' in l;
   };
   const adjLine = isAdjustmentLine(line) ? line : undefined;

   return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-[#1A2234]/30 border-t border-gray-100 dark:border-gray-800 rounded-b-xl w-full text-start">
     {/* Compact 2-Column Grid */}
     <div className="grid grid-cols-2 gap-4 w-full">
      {/* Row 0: Quantity | UOM */}
      <div className="flex flex-col">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{h.qty}</span>
       <div className="flex h-8 items-center w-full">
        {renderQty ? renderQty(line) : (
         <span className="text-sm font-black text-[#0B1220] dark:text-white" dir="ltr">
          {formatQuantity(line.qty, locale as 'ar' | 'en')}
         </span>
        )}
       </div>
      </div>
      <div className="flex flex-col">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{h.uom}</span>
       <div className="flex h-8 items-center w-full">
        {renderUom ? renderUom(line) : (
         <span className="text-sm font-black text-[#0B1220] dark:text-white uppercase">
          {line.item.primaryUom?.name || line.item.primaryUom?.code || 'N/A'}
         </span>
        )}
       </div>
      </div>

      {/* Row 1: Unit Cost | Direction */}
      <div className="flex flex-col">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{unitCostCol?.header || (locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost')}</span>
       <div className="flex h-8 items-center w-full">
        {unitCostCol ? unitCostCol.cell(line) : (
         <span className="text-sm font-black text-[#0B1220] dark:text-white">
          {adjLine?.direction === 'INCREASE'
           ? (adjLine.unitCost !== null && adjLine.unitCost !== undefined
              ? formatQuantity(adjLine.unitCost, locale as 'ar' | 'en')
              : '0')
           : '—'}
         </span>
        )}
       </div>
      </div>
      <div className="flex flex-col">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{directionCol?.header || (locale === 'ar' ? 'الاتجاه' : 'Direction')}</span>
       <div className="flex h-8 items-center w-full">
        {directionCol ? directionCol.cell(line) : null}
       </div>
      </div>

      {/* Row 2: Before | After */}
      <div className="flex flex-col">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{beforeCol?.header || (locale === 'ar' ? 'قبل' : 'Qty Before')}</span>
       <div className="flex h-8 items-center w-full">
        {beforeCol ? beforeCol.cell(line) : (
         <span className="text-sm font-black text-muted-foreground/45" lang="en" dir="ltr">
          {formatQuantity(adjLine?.qtyBefore ?? 0, locale as 'ar' | 'en')}
         </span>
        )}
       </div>
      </div>
      <div className="flex flex-col">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{afterCol?.header || (locale === 'ar' ? 'بعد التعديل' : 'Qty After')}</span>
       <div className="flex h-8 items-center w-full">
        {afterCol ? afterCol.cell(line) : (
         <span className="text-sm font-black text-[#0B1220] dark:text-white" lang="en" dir="ltr">
          {formatQuantity(
           adjLine?.direction === 'INCREASE'
            ? (adjLine.qtyBefore ?? 0) + line.qty
            : (adjLine.qtyBefore ?? 0) - line.qty,
           locale as 'ar' | 'en'
          )}
         </span>
        )}
       </div>
      </div>
     </div>

     {/* Row 3 (Full Width): Lot Allocations / Dropdown / Selector */}
     {lotCol && (
      <div className="flex flex-col w-full border-t border-gray-100 dark:border-gray-800/50 pt-3">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{lotCol.header}</span>
       <div className="w-full">
        {lotCol.cell(line)}
       </div>
      </div>
     )}

     {/* Remaining columns if any (rendered full-width below) */}
     {remainingCols.map((col, idx) => (
      <div key={idx} className="flex flex-col w-full border-t border-gray-100 dark:border-gray-800/50 pt-3">
       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{col.header}</span>
       <div className="w-full">
        {col.cell(line)}
       </div>
      </div>
     ))}
    </div>
   );
  };"""

content_norm = content.replace('\r\n', '\n')

# Check and insert helper function (only once)
if "renderAdjustmentMobileCard" not in content_norm:
    content_norm = content_norm.replace(locale_target.replace('\r\n', '\n'), helper_code)

lines = content_norm.split('\n')

start_idx_1 = None
for i, line in enumerate(lines):
    if "mobileLayoutPattern === 'adjustment-form'" in line:
        start_idx_1 = i
        break

start_idx_2 = None
for i, line in enumerate(lines):
    if i > (start_idx_1 or 0) + 10 and "mobileLayoutPattern === 'adjustment-form'" in line:
        start_idx_2 = i
        break

print(f"Indices found: {start_idx_1}, {start_idx_2}")

if start_idx_1 is not None and start_idx_2 is not None:
    end_idx_1 = None
    for j in range(start_idx_1 + 1, len(lines)):
        if "issue-form" in lines[j]:
            end_idx_1 = j
            break
            
    end_idx_2 = None
    for j in range(start_idx_2 + 1, len(lines)):
        if "variance-form" in lines[j]:
            end_idx_2 = j
            break

    print(f"End indices found: {end_idx_1}, {end_idx_2}")

    if end_idx_1 is not None and end_idx_2 is not None:
        indent_1 = lines[start_idx_1].split('{')[0]
        replacement_1 = [
            f"{indent_1}{{mobileLayoutPattern === 'adjustment-form' ? (",
            f"{indent_1} renderAdjustmentMobileCard(line)",
            f"{indent_1}) : mobileLayoutPattern === 'issue-form' ? ("
        ]
        
        indent_2 = lines[start_idx_2].split('{')[0]
        replacement_2 = [
            f"{indent_2}{{mobileLayoutPattern === 'adjustment-form' ? (",
            f"{indent_2} renderAdjustmentMobileCard(line)",
            f"{indent_2}) : mobileLayoutPattern === 'variance-form' ? ("
        ]
        
        lines = lines[:start_idx_2] + replacement_2 + lines[end_idx_2+1:]
        lines = lines[:start_idx_1] + replacement_1 + lines[end_idx_1+1:]
        
        final_content = '\n'.join(lines).replace('\n', '\r\n')
        with open(filepath, 'wb') as f:
            f.write(final_content.encode('utf-8'))
        print("SUCCESS")
    else:
        print("FAILED TO FIND END INDEX")
else:
    print("FAILED TO FIND START INDEX")
