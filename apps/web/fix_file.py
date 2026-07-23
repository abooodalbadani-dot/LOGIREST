with open('src/app/[locale]/(app)/master-data/items/ItemFormClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_content = """      <ConflictDialog
        open={conflict.open}
                    <ScanLine className="w-5 h-5 text-primary shrink-0" />
                    {locale === 'ar' ? 'مسح الباركود بالكاميرا' : 'Camera Barcode Scan'}
                </DialogTitle>
            </DialogHeader>
            <div className="w-full">
                {isCameraOpen && (
                    <CameraBarcodeScanner
                        onScanSuccess={(barcode) => {
                            audioAlerts.playScanSuccess();
                            setValue('barcode', barcode, { shouldDirty: true, shouldValidate: true });
                            setIsCameraOpen(false);
                        }}
                    />
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}"""

good_content = """      <ConflictDialog
        open={conflict.open}
        error={conflict.error}
        onReload={conflict.handleReload}
        onClose={conflict.handleClose}
      />

      <PostConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title={ti('delete_confirm_title')}
        description={ti('delete_confirm_desc')}
        confirmText={t('actions.delete')}
        variant="destructive"
        icon="delete"
      />

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="w-[min(440px,95vw)] bg-card border border-border shadow-lg p-0 rounded-2xl overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
                <DialogTitle className="text-label-sm font-bold uppercase text-foreground flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-primary shrink-0" />
                    {locale === 'ar' ? 'مسح الباركود بالكاميرا' : 'Camera Barcode Scan'}
                </DialogTitle>
            </DialogHeader>
            <div className="w-full">
                {isCameraOpen && (
                    <CameraBarcodeScanner
                        onScanSuccess={(barcode) => {
                            audioAlerts.playScanSuccess();
                            setValue('barcode', barcode, { shouldDirty: true, shouldValidate: true });
                            setIsCameraOpen(false);
                        }}
                    />
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}"""

content = content.replace(bad_content.strip(), good_content.strip())
with open('src/app/[locale]/(app)/master-data/items/ItemFormClient.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
