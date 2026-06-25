import os

file_path = r"c:\kitchen-store-inventory-system\apps\web\src\features\purchasing\components\grn-form.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace the extraColumns={[ ... ]} block
start_sig = "extraColumns={["
start_idx = content.find(start_sig)

if start_idx != -1:
    print(f"Found {start_sig} at index {start_idx}")
    # Let's find the matching ]} using bracket counting
    # We start counting at start_idx + len("extraColumns=") which is the open {
    brace_count = 0
    end_idx = -1
    for k in range(start_idx + len("extraColumns="), len(content)):
        char = content[k]
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = k + 1
                break
                
    if end_idx != -1:
        print(f"Matched closing brace at index {end_idx}")
        # The content to replace is from start_idx to end_idx
        # Let's print a preview of what we are replacing
        print("Replacing block:")
        print(content[start_idx:start_idx+100] + "\n...\n" + content[end_idx-100:end_idx])
        
        # New block content (we can determine its indentation from the line start before start_idx)
        line_start = content.rfind('\n', 0, start_idx) + 1
        indent = content[line_start:start_idx]
        print(f"Detected indent: {len(indent)} spaces")
        
        new_block = """extraColumns={[
   {
      header: tc('table_headers.received_qty'),
      cell: (field: LineItem) => {
         const index = fields.findIndex(f => f.id === field.id);
         const isOver = field.receivedQty > field.qty;
         const hasError = !!errors.lines?.[index]?.receivedQty;
         return (
            <input type="number"
               dir="ltr"
               disabled={isLocked || isWarehouseLocked}
               className={cn(
                  "w-full md:w-20 rounded-md md:rounded-sm border text-center px-3 py-2 md:px-2 md:py-0.5 font-mono text-sm md:text-xs outline-none transition-all disabled:opacity-50 h-10 md:h-7",
                  hasError
                     ? "border-destructive ring-1 ring-destructive bg-destructive/10 text-destructive focus:border-destructive"
                     : isOver
                        ? "border-amber-500 ring-1 ring-amber-500 bg-amber-500/10 text-amber-500 focus:border-amber-400"
                        : "bg-transparent md:bg-background/50 border border-gray-600 md:border-brand-gold/40 hover:border-gray-500 md:hover:border-brand-gold/70 text-white md:text-foreground focus:ring-1 focus:ring-brand-gold/50 focus:border-brand-gold shadow-none placeholder:text-muted-foreground"
               )}
               {...register(`lines.${index}.receivedQty` as const, { valueAsNumber: true })}
            />
         );
      }
   },
   {
      header: tc('table_headers.lot_allocation'),
      isAction: true,
      cell: (field: LineItem) => {
         const hasLot = !!field.lot;
         return (
            <button
               type="button"
               className={cn(
                  'inline-flex items-center transition-all',
                  hasLot
                     ? 'bg-operational-cyan/10 text-operational-cyan hover:bg-operational-cyan/20 text-label-xs font-semibold uppercase rounded-md md:rounded-lg px-4 py-2 md:px-2.5 md:py-1 border border-operational-cyan/30 md:border-none w-full md:w-auto justify-center md:justify-start mt-4 md:mt-0 font-mono'
                     : 'border border-[#b48e67] text-[#b48e67] px-4 py-2 rounded-md hover:bg-[#b48e67] hover:text-black w-full text-center mt-4 md:mt-0 md:w-auto md:border-none md:text-primary md:underline md:underline-offset-4 md:decoration-dotted md:decoration-primary/40 md:hover:decoration-primary md:px-2.5 md:py-1 md:rounded-lg text-xs md:text-label-xs font-semibold uppercase'
               )}
               onClick={() => handleLotClick(field)}
            >
               {hasLot ? (
                  <>
                     <span className="w-1.5 h-1.5 rounded-full bg-operational-cyan shrink-0" />
                     <span dir="ltr" className="font-mono">{field.lot!.lotNumber}</span>
                  </>
               ) : (
                  t('allocate_lot')
               )}
            </button>
         );
      }
   }
]}"""
        # Indent each line of new_block to match the original indentation
        indented_lines = []
        for i, line in enumerate(new_block.split('\n')):
            if i == 0:
                indented_lines.append(indent + line)
            else:
                indented_lines.append(indent + line if line.strip() else "")
        indented_block = "\n".join(indented_lines)
        
        updated_content = content[:line_start] + indented_block + content[end_idx:]
        
        with open(file_path, 'w', encoding='utf-8', newline='\r\n') as f:
            f.write(updated_content)
        print("Successfully updated grn-form.tsx with new extraColumns!")
    else:
        print("Could not find matching brace")
else:
    print("Could not find extraColumns in grn-form.tsx")
