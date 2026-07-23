with open('src/app/[locale]/(app)/master-data/barcodes/BarcodeFormClient.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_content = []
skip = False
for line in lines:
    if '<div className="flex items-center gap-2 border-b border-border pb-3 mb-4">' in line:
        skip = True
        new_content.append("""            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
              <BarcodeIcon className="text-muted-foreground w-5 h-5" />
              <h3 className="text-base font-bold text-foreground">{tb('fields.code')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full min-w-0 flex flex-col gap-1.5 text-start">
                <Label htmlFor="bc-val" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  {tb('fields.code')}
                </Label>
                <div className="relative w-full flex flex-col sm:flex-row items-stretch gap-2">
                  <div className="flex-1 min-w-0">
                    <ScanInput
                      onScan={(val) => setValue('code', val, { shouldValidate: true })}
                      placeholder={isReadOnly ? "" : tb('scan_or_type')}
                      disabled={isReadOnly}
                      size="md"
                      actions={
                        !isReadOnly && (
                          <Button
                            type="button"
                            onClick={() => {
                              const generated = 'BAR' + Math.floor(10000000 + Math.random() * 90000000);
                              setValue('code', generated, { shouldDirty: true, shouldValidate: true });
                            }}
                            className="h-8 px-4 text-[10px] sm:text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-bold uppercase tracking-wider ml-2"
                          >
                            {locale === 'ar' ? 'توليد' : 'Generate'}
                          </Button>
                        )
                      }
                    />
                  </div>
                </div>
                <Input type="hidden" {...register('code')} />
                {errors.code && <p className="text-xs text-red-500 mt-1">{tv(errors.code.message as never)}</p>}
              </div>
            </div>

            {currentCode && (
""")
    if '{currentCode && (' in line and skip:
        skip = False
        continue
    
    if not skip:
        new_content.append(line)

with open('src/app/[locale]/(app)/master-data/barcodes/BarcodeFormClient.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_content)
