import os

file_path = r"c:\kitchen-store-inventory-system\apps\web\src\components\shared\DocumentLineItemTable\DocumentLineItemTable.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Let's find the start of the else block for non-virtualized map
# The virtualized map starts with: lines.length === 0
# then enableVirtualization ? (
# then virtualRows.map((virtualRow) => {
# then lines.map((line, idx) => (
start_idx = -1
for i, line in enumerate(lines):
    if "lines.map((line, idx) => (" in line and i > 250:
        start_idx = i
        break

if start_idx != -1:
    print(f"Found non-virtualized lines.map at line {start_idx + 1}")
    # Now find the corresponding closing </tr>
    end_idx = -1
    for j in range(start_idx, len(lines)):
        if "</tr>" in lines[j]:
            end_idx = j
            break
            
    if end_idx != -1:
        print(f"Found corresponding </tr> at line {end_idx + 1}")
        
        # We will replace from start_idx + 1 (the <tr> tag itself or right after) to end_idx + 1 (the </tr> tag)
        # Let's verify the lines to replace:
        print("Lines to replace:")
        for idx in range(start_idx, end_idx + 1):
            print(f"{idx+1}: {lines[idx].strip()}")
            
        # Let's rebuild the content
        new_content_block = """        <tr 
         key={line.id} 
         className={cn(
          "group transition-all hover:bg-primary/[0.04]",
          dense ? "md:border-none" : "md:border-b",
          idx % 2 === 0 ? "md:bg-card md:border md:border-border md:shadow-sm" : "md:bg-card md:border md:border-border md:shadow-sm/30",
          rowClassName?.(line, idx),
          "flex flex-col p-5 mb-4 border border-gray-700 bg-[#1A2234] rounded-2xl md:table-row md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-md md:shadow-none"
         )}
        >
         {/* Mobile card layout */}
         <td className="block w-full p-0 border-none bg-transparent md:hidden">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-3 w-full">
           <div className="flex flex-col gap-0.5">
            <span className="font-bold text-lg text-white">
             {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
            </span>
            <span className="text-xs text-gray-400 font-mono tracking-wider uppercase" dir="ltr">
             {line.item.code}
            </span>
           </div>
           {!isReadOnly && onRemoveLine && (
            <button
             type="button"
             onClick={() => onRemoveLine(line.id)}
             className="p-2 bg-[#2D3748] hover:bg-[#4A5568] text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center animate-in fade-in zoom-in-75 duration-200"
             aria-label={tc('actions.remove_line')}
            >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
            </button>
           )}
          </div>

          {/* Data Grid Section */}
          <div className="grid grid-cols-2 gap-4">
           {/* PO Qty */}
           <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider">{h.qty}</label>
            <div className="bg-transparent border border-gray-600 rounded-md p-2 text-white font-mono flex items-center h-10">
             {line.qty}
            </div>
           </div>

           {/* UOM */}
           <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider">{h.uom}</label>
            <div className="bg-transparent border border-gray-600 rounded-md p-2 text-white uppercase flex items-center h-10">
             {line.item.primaryUom?.name || line.item.primaryUom?.code || 'N/A'}
            </div>
           </div>

           {/* Received Qty / extra fields */}
           {extraColumns.filter(col => !isActionColumn(col)).map((col, i) => (
            <div key={i} className="flex flex-col gap-1 col-span-2 sm:col-span-1">
             <label className="text-[10px] text-gray-400 uppercase tracking-wider">{col.header}</label>
             <div className="w-full">
              {col.cell(line)}
             </div>
            </div>
           ))}
          </div>

          {/* Actions / Lot Allocation */}
          {extraColumns.filter(col => isActionColumn(col)).map((col, i) => (
           <div key={i} className="w-full">
            {col.cell(line)}
           </div>
          ))}
         </td>

         {/* Desktop Layout cells (hidden on mobile) */}
         <td className={cn("hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5")}>
          <div className="flex flex-col gap-0.5">
           <span className={cn("font-bold text-foreground group-hover:text-operational-cyan transition-colors truncate block", dense ? "text-xs" : "text-body-md")}>
            {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
           </span>
           <span className={cn("font-mono font-semibold text-muted-foreground/40 tracking-wider uppercase", dense ? "text-[9px]" : "text-[10px]")} dir="ltr">
            {line.item.code}
           </span>
          </div>
         </td>
         {!hideLotColumns && (
          <>
           <td className={cn("font-mono text-label-xs text-muted-foreground/60 hidden md:table-cell md:align-middle", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
            {line.lot ? <span dir="ltr">{line.lot.lotNumber}</span> : <span className="opacity-20">—</span>}
           </td>
           <td className={cn("font-mono text-label-xs text-muted-foreground/60 hidden md:table-cell md:align-middle", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
            {line.lot?.expiryDate
             ? <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
             : <span className="opacity-20">—</span>}
           </td>
          </>
         )}
         <td className={cn("hidden md:table-cell md:align-middle text-center", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
          <div className="flex items-center justify-center w-full">
           {renderQty ? (
            renderQty(line)
           ) : (
            <span dir="ltr" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-body-md px-3 py-1")}>
             {line.qty}
            </span>
           )}
          </div>
         </td>
         <td className={cn("hidden md:table-cell md:align-middle", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
          <div className="flex items-center w-full">
           {renderUom ? (
            renderUom(line)
           ) : (
            <RelationalName name={line.item.primaryUom?.name || line.item.primaryUom?.code} rawId={line.uomId} fallback="N/A" className="text-xs font-medium uppercase text-muted-foreground" />
           )}
          </div>
         </td>
         {extraColumns.map((col, i) => (
          <td key={i} className={cn("hidden md:table-cell md:align-middle text-center", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
           {col.cell(line)}
          </td>
         ))}
         {!isReadOnly && onRemoveLine && (
          <td className={cn("hidden md:table-cell md:align-middle text-center", dense ? "px-2 py-1" : "px-6")}>
           <button
            type="button"
            onClick={() => onRemoveLine(line.id)}
            className={cn("text-muted-foreground/20 hover:text-destructive hover:bg-destructive/5 transition-all rounded-sm", dense ? "p-1" : "p-2")}
            aria-label={tc('actions.remove_line')}
           >
            <svg className={cn(dense ? "w-3.5 h-3.5" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
           </button>
          </td>
         )}
        </tr>
"""
        # Split the new content block into lines
        new_lines = [l + '\n' for l in new_content_block.strip('\n').split('\n')]
        
        # Slice original lines to replace
        updated_lines = lines[:start_idx + 1] + new_lines + lines[end_idx + 1:]
        
        # Write back to file with proper windows line endings
        with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
            f.writelines(updated_lines)
            
        print("Successfully updated DocumentLineItemTable.tsx with non-virtualized card layout cells!")
    else:
        print("Could not find corresponding </tr>")
else:
    print("Could not find lines.map after line 250")
