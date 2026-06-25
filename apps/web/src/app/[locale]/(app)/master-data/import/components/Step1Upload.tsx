'use client';

import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import * as XLSX from 'xlsx';

import { ImportWizardState } from '../types';

interface Step1UploadProps {
 wizard: ImportWizardState;
 locale: string;
}

export function Step1Upload({ wizard, locale: _locale }: Step1UploadProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');
 
 const handleFile = (file: File) => {
 if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
 const reader = new FileReader();
 reader.onload = (e) => {
 const data = new Uint8Array(e.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const sheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[sheetName];
 const json = XLSX.utils.sheet_to_json(worksheet);
 
 wizard.setFileData(file.name, file.size, json as Record<string, unknown>[]);
 };
 reader.readAsArrayBuffer(file);
 }
 };


 const downloadTemplate = () => {
 let headers: string[] = [];
 let fileName = '';

 if (wizard.importType === 'items') {
 headers = ['sku', 'name_en', 'name_ar', 'category', 'base_unit', 'min_stock', 'reorder_point'];
 fileName = 'items_template.xlsx';
 } else if (wizard.importType === 'uoms') {
 headers = ['code', 'name_en', 'name_ar'];
 fileName = 'uoms_template.xlsx';
 } else if (wizard.importType === 'barcodes') {
 headers = ['barcode', 'item_sku', 'uom_code', 'default_qty'];
 fileName = 'barcodes_template.xlsx';
 }

 const ws = XLSX.utils.aoa_to_sheet([headers]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Template');
 XLSX.writeFile(wb, fileName);
 };

 return (
 <div className="max-w-2xl mx-auto flex flex-col gap-8 py-12">
 <Card className="group relative border-dashed border-2 border-muted-foreground/20 bg-muted/5 p-12 flex flex-col items-center gap-6 hover:border-cyan-500/50 hover:bg-muted/50 transition-all duration-500 cursor-pointer overflow-hidden rounded-[2.5rem]">
 <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
 
 <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
 <Upload className="w-10 h-10 text-foreground" />
 </div>

 <div className="text-center relative z-10">
 <h3 className="text-title-sm font-semibold mb-2">{t('drop_file')}</h3>
 <p className="text-label-xs text-muted-foreground font-semibold uppercase opacity-60">
 {t('max_size')}
 </p>
 </div>

 <Input 
 type="file" 
 aria-label={t('drop_file') || "Upload File"}
 className="absolute inset-0 opacity-0 cursor-pointer" 
 accept=".xlsx,.xls"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleFile(file);
 }}
 />
 </Card>

 <div className="flex flex-col gap-4">
 <div className="flex items-center gap-4">
 <div className="h-px flex-1 bg-muted-foreground/10" />
 <span className="text-label-xs font-semibold uppercase text-muted-foreground/30">{tc('or')}</span>
 <div className="h-px flex-1 bg-muted-foreground/10" />
 </div>

 <Button 
 variant="outline" 
 className="h-16 rounded-2xl border-muted-foreground/10 hover:border-cyan-500/40 hover:bg-muted/50 transition-all group overflow-hidden relative"
 onClick={downloadTemplate}
 >
 <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
 <Download className="w-4 h-4 me-2 text-foreground group-hover:-translate-y-1 transition-transform" />
 <span className="font-bold">{t('download_template')}</span>
 </Button>
 </div>
 </div>
 );
}
