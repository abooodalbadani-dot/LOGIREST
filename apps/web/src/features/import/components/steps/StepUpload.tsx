'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Upload, FileIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTemplateHeaders } from '@/lib/import/templates';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

import { WizardReturn } from '../../hooks/useImportWizard';

interface StepUploadProps {
 wizard: WizardReturn;
 locale: string;
}

export function StepUpload({ wizard, locale }: StepUploadProps) {
 const t = useTranslations('master_data.import');
 const [file, setFile] = useState<File | null>(null);
 const [isParsing, setIsParsing] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleDownloadTemplate = () => {
 const headers = getTemplateHeaders(wizard.entity);
 const ws = XLSX.utils.aoa_to_sheet([headers]);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Template');
 XLSX.writeFile(wb, `${wizard.entity}_template.xlsx`);
 };

 const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const selectedFile = e.target.files?.[0];
 if (!selectedFile) return;

 // Check file type
 if (!selectedFile.name.endsWith('.xlsx')) {
 alert(t('invalid_file_type')); // In real app use a toast
 return;
 }

 // Check size (20MB)
 if (selectedFile.size > 20 * 1024 * 1024) {
 alert(t('file_too_large'));
 return;
 }

 setFile(selectedFile);
 };

 const handleUpload = () => {
 if (!file) return;

 setIsParsing(true);
 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const data = new Uint8Array(e.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const sheet = workbook.Sheets[workbook.SheetNames[0]];
 const json = XLSX.utils.sheet_to_json(sheet);
 
 if (json.length === 0) {
 alert(t('empty_file'));
 setIsParsing(false);
 return;
 }

 wizard.setFileData(file.name, file.size, json as Record<string, unknown>[]);
 } catch (error) {
 console.error('Error parsing file:', error);
 alert(t('parse_error'));
 } finally {
 setIsParsing(false);
 }
 };
 reader.readAsArrayBuffer(file);
 };

 return (
 <div className="flex flex-col items-center justify-center gap-10 py-10 animate-in fade-in slide-in-from-bottom-4 duration-200">
  <div className="text-center space-y-4 w-full">
  <h2 className="text-headline-lg font-semibold text-foreground">
  {t('upload_title')}
  </h2>
  <p className="text-muted-foreground text-body-md leading-relaxed">
  {t('upload_description')}
  </p>
  </div>

 <div className="w-full space-y-8">
 {/* Drop Zone / Selection */}
 {!file ? (
 <div 
 onClick={() => fileInputRef.current?.click()}
 className="group cursor-pointer border-2 border-dashed border-muted-foreground/10 rounded-2xl p-16 flex flex-col items-center gap-6 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/[0.02]"
 >
 <div className="w-20 h-20 rounded-2xl bg-surface-container-low flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-cyan-500/10 group-hover:text-cyan-500">
 <Upload className="w-10 h-10" />
 </div>
  <div className="text-center">
  <p className="font-bold text-body-md mb-1">{t('click_to_upload')}</p>
  <p className="text-label-sm text-muted-foreground font-medium opacity-60">{t('upload_hint')}</p>
  </div>
 <input 
 type="file" 
 ref={fileInputRef} 
 className="hidden" 
 accept=".xlsx"
 aria-label={t('click_to_upload') || "Upload XLSX file"}
 onChange={onFileChange}
 />
 </div>
 ) : (
 <div className="bg-surface-container-low/50 rounded-2xl p-8 flex items-center justify-between animate-in zoom-in-95 duration-300">
 <div className="flex items-center gap-5">
 <div className="w-16 h-16 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
 <FileIcon className="w-8 h-8" />
 </div>
 <div>
 <p className="font-bold text-title-sm leading-none mb-2">{file.name}</p>
  <p className="text-label-sm font-mono text-muted-foreground">
  {(file.size / 1024 / 1024).toFixed(2)} MB
  </p>
 </div>
 </div>
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => setFile(null)}
 className="rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors"
 >
 <X className="w-6 h-6" />
 </Button>
 </div>
 )}

 {/* Actions */}
 <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
 <Button 
 variant="outline" 
 onClick={handleDownloadTemplate}
 className="w-full sm:w-auto px-10 h-14 rounded-xl border-muted-foreground/10 bg-surface-container-low hover:bg-surface-container-high transition-all active:scale-95 group"
 >
  <Download className="w-5 h-5 me-3 transition-transform group-hover:-translate-y-1" />
  <span className="font-bold text-label-sm">{t('download_template')}</span>
  </Button>
  
  <Button 
  disabled={!file || isParsing}
  onClick={handleUpload}
  className={cn(
  "w-full sm:w-auto px-16 h-14 rounded-xl font-bold text-label-sm transition-all active:scale-95",
  file ? "primary-gradient shadow-neon-sm" : "opacity-50 grayscale"
  )}
  >
  {isParsing ? <Loader2 className="w-5 h-5 animate-spin me-3" /> : <Upload className="w-5 h-5 me-3" />}
  {t('upload_cta')}
  </Button>
 </div>
 </div>

  <div className="flex items-center gap-3 p-5 rounded-2xl bg-amber-500/5 text-amber-500 border border-amber-500/10 w-full">
  <Loader2 className="w-5 h-5 animate-pulse shrink-0" />
  <p className="text-label-xs font-bold leading-relaxed">
  {t('upload_warning')}
  </p>
  </div>
 </div>
 );
}
