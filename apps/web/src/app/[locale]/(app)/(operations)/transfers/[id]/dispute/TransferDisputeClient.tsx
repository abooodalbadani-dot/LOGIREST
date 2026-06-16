'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import React, { useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/button';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { SmartCombobox } from '@/components/shared/SmartCombobox';
import { ArrowLeft, Scale, CheckCircle, AlertTriangle, Info, UploadCloud, File as FileIcon, X } from 'lucide-react';
import { TransferLine, type TransferDetail } from '@/features/operations/hooks/useTransfer';

interface TransferDisputeClientProps {
 transfer: TransferDetail;
 locale: 'ar' | 'en';
}

export function TransferDisputeClient({ transfer, locale }: TransferDisputeClientProps) {
 const t = useTranslations('operations.transfer');
 const tCommon = useTranslations('common');
 const router = useRouter();
 
 const [evidenceFiles, setEvidenceFiles] = React.useState<File[]>([]);

 const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
   setEvidenceFiles(prev => [...prev, ...Array.from(e.dataTransfer.files!)]);
  }
 };

 const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
 };

 const removeFile = (index: number) => {
  setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
 };

 const resolutionItems = useMemo(() => [
  { id: 'ACCEPT_RECEIVED', name_en: t('action_accept_received') || 'Accept Received Qty', name_ar: t('action_accept_received') || 'Accept Received Qty' },
  { id: 'CLAIM_VENDOR', name_en: t('action_claim_vendor') || 'Claim Against Shipper', name_ar: t('action_claim_vendor') || 'Claim Against Shipper' },
  { id: 'WRITE_OFF', name_en: t('action_write_off') || 'Write-off Loss', name_ar: t('action_write_off') || 'Write-off Loss' },
 ], [t]);

 // Filter lines that have variances
 const discrepantLines = transfer?.lines?.filter(line => 
  line.shippedQty !== undefined && 
  line.receivedQty !== null && line.receivedQty !== undefined && 
  line.shippedQty !== line.receivedQty
 ) ?? [];

 return (
  <div className="min-w-0 max-w-[1600px] flex-1 fade-in gap-6 duration-1000 slide-in-from-bottom-4 p-8 mx-auto animate-in flex-col flex space-y-10 w-full">
   <div className="flex items-center justify-between">
    <Breadcrumb 
     items={[
      { label: t('title'), href: `/transfers` },
      { label: transfer?.documentNumber || 'Transfer', href: `/transfers/${transfer?.id}` },
      { label: t('dispute_title') || 'Dispute Mediation' }
     ]} 
    />
    <Button
     variant="ghost"
     onClick={() => router.back()}
     className="text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
    >
     <ArrowLeft className="w-3 h-3 me-2" />
     {tCommon('back')}
    </Button>
   </div>

   <PageHeader
    title={t('dispute_title') || 'Dispute Mediation'}
    description={
     <div className="flex items-center gap-3">
      <Scale className="w-5 h-5 text-operational-cyan/60" />
      <span className="uppercase font-bold text-label-sm tracking-widest text-muted-foreground/60">
       Resolving quantities for Transfer <span dir="ltr" className="text-operational-cyan">{transfer?.documentNumber}</span>
      </span>
     </div>
    }
    actions={
     <div className="flex gap-4">
      <Button variant="outline" className="h-11 px-6 font-semibold uppercase text-label-xs rounded-sm">
       {t('request_recount') || 'Request Recount'}
      </Button>
      <Button className="h-11 px-8 bg-operational-cyan text-white hover:bg-operational-cyan/90 transition-all font-semibold uppercase text-label-xs rounded-sm shadow-sm shadow-operational-cyan/20">
       <CheckCircle className="w-4 h-4 me-2" />
       {t('finalize_resolution') || 'Finalize Resolution'}
      </Button>
     </div>
    }
   />

   {/* Mediation Summary Card */}
   <div className="p-8 bg-card border border-border shadow-sm rounded-lg border border-outline-low relative overflow-hidden">
    <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${locale === 'ar' ? 'from-transparent via-amber-500/10 to-amber-500/50' : 'from-amber-500/50 via-amber-500/10 to-transparent'}`} />
    <div className="flex items-start gap-6">
     <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
      <AlertTriangle className="w-7 h-7 text-amber-500" />
     </div>
     <div className="space-y-2">
      <h3 className="text-body-md font-semibold uppercase text-foreground">
       {t('variance_detected') || 'Discrepancies Detected'}
      </h3>
      <p className="text-label-sm text-muted-foreground/70 uppercase leading-relaxed font-medium max-w-3xl">
       {t('dispute_instruction') || 'Please review the variances below. You must decide whether to accept the receiving warehouse\'s count, stick to the shipping records, or mark items as lost in transit.'}
      </p>
     </div>
    </div>
   </div>

   {/* Discrepancy Table */}
   <div className="space-y-6">
    <div className="flex items-center gap-3 border-s-4 border-operational-cyan ps-4">
     <Info className="w-5 h-5 text-operational-cyan" />
     <h2 className="text-body-md font-semibold uppercase text-foreground">
      {t('discrepancy_list') || 'Item-wise Variance Audit'}
     </h2>
    </div>
    
    <div className="bg-card border border-border shadow-sm rounded-lg border border-outline-low overflow-hidden shadow-2xl">
     <DocumentLineItemTable
      lines={discrepantLines}
      locale={locale as 'ar' | 'en'} 
      isReadOnly={true}
      onRemoveLine={() => {}}
      hideLotColumns={true}
      headers={{
       code: tCommon('table_headers.code'),
       name: tCommon('table_headers.name'),
       qty: t('shipped_qty'),
       uom: tCommon('table_headers.uom'),
      }}
      extraColumns={[
       {
        header: t('received_qty'),
        cell: (line: TransferLine) => (
         <div className="flex justify-center">
          <span dir="ltr" className="font-mono text-body-md font-bold bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-md border border-amber-500/20">
           {line.receivedQty}
          </span>
         </div>
        ),
       },
       {
        header: t('variance'),
        cell: (line: TransferLine) => {
         const variance = (line.receivedQty ?? 0) - (line.shippedQty ?? 0);
         return (
           <div className="flex justify-center">
            <span dir="ltr" className={`font-mono text-body-md font-bold px-4 py-1.5 rounded-md border ${variance < 0 ? 'bg-status-error/10 text-status-error border-status-error/20' : 'bg-status-success/10 text-status-success border-status-success/20'}`}>
             {variance > 0 ? '+' : ''}{variance}
            </span>
           </div>
         );
        },
       },
       {
        header: t('resolution_action') || 'Resolution Action',
        cell: (line: TransferLine) => (
         <div className="flex justify-center px-4 min-w-[200px]">
          <SmartCombobox
           items={resolutionItems}
           value="ACCEPT_RECEIVED"
           onSelect={() => {}}
           placeholder={t('resolution_action') || 'Resolution Action'}
           className="w-full bg-surface-container-highest/20 border border-outline-low h-10 px-4 text-label-xs font-bold uppercase rounded-md"
          />
         </div>
        ),
       },
      ]}
     />
    </div>

    {/* Evidence Upload Area */}
    <div className="space-y-4">
     <div className="flex items-center gap-3 border-s-4 border-operational-cyan ps-4">
      <UploadCloud className="w-5 h-5 text-operational-cyan" />
      <h2 className="text-body-md font-semibold uppercase text-foreground">
       {t('evidence_upload') || 'Upload Evidence'}
      </h2>
     </div>
     
     <div 
      className="border-2 border-dashed border-outline-low/50 bg-card border border-border shadow-sm hover:bg-card border border-border shadow-sm/50 transition-colors rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer min-w-0"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => document.getElementById('evidence-upload')?.click()}
     >
      <input 
       type="file" 
       id="evidence-upload" 
       className="hidden" 
       multiple 
       onChange={(e) => {
        if (e.target.files) {
         setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
       }}
      />
      <div className="w-16 h-16 rounded-full bg-operational-cyan/10 flex items-center justify-center mb-4">
       <UploadCloud className="w-8 h-8 text-operational-cyan" />
      </div>
      <p className="text-label-sm font-semibold uppercase text-foreground">
       {t('drag_and_drop') || 'Drag & drop files here'}
      </p>
      <p className="text-label-xs text-muted-foreground mt-2 uppercase font-medium">
       {t('or_browse') || 'or click to browse'}
      </p>
     </div>

     {evidenceFiles.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
       {evidenceFiles.map((f, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-card border border-border shadow-sm border border-outline-low rounded-lg shadow-sm">
         <FileIcon className="w-6 h-6 text-operational-cyan/60 shrink-0" />
         <div className="flex-1 min-w-0">
          <p className="text-label-xs font-semibold truncate uppercase">{f.name}</p>
          <p className="text-label-xxs text-muted-foreground font-mono mt-0.5">{(f.size / 1024).toFixed(1)} KB</p>
         </div>
         <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-md transition-colors">
          <X className="w-4 h-4" />
         </button>
        </div>
       ))}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
