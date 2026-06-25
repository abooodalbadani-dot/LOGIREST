'use client';

import { useTranslations } from 'next-intl';
import { Save, CheckCircle2, Loader2, ArrowLeft, Database, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/navigation';

import { ImportWizardState } from '../types';
 
 interface Step4CommitProps {
 wizard: ImportWizardState;
 }

export function Step4Commit({ wizard }: Step4CommitProps) {
 const t = useTranslations('master_data.import');
 const tc = useTranslations('common');
 const router = useRouter();

 const handleFinish = () => {
 router.push(`/master-data/${wizard.importType === 'uoms' ? 'units-of-measure' : wizard.importType}`);
 };

 if (wizard.successCount > 0) {
 return (
 <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20 gap-8 animate-in zoom-in duration-500">
 <div className="w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center relative">
 <div className="absolute inset-0 bg-muted/50 blur-3xl rounded-full" />
 <CheckCircle2 className="w-16 h-16 text-foreground relative z-10" />
 </div>
 
 <div className="text-center">
 <h3 className="text-headline-lg font-semibold mb-3">
 {t('import_success', { count: wizard.successCount })}
 </h3>
 <p className="text-muted-foreground font-medium max-w-sm mx-auto">
 Master records have been successfully synchronized with the central database registry.
 </p>
 </div>

 <div className="flex gap-4 w-full max-w-md mt-4">
 <Button 
 variant="outline" 
 className="flex-1 h-16 rounded-2xl border-emerald-500/20 hover:bg-muted/50 font-bold"
 onClick={wizard.reset}
 >
 Import More
 </Button>
 <Button 
 className="flex-1 h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold uppercase text-label-xs"
 onClick={handleFinish}
 >
 <ExternalLink className="w-4 h-4 me-2" />
 View {wizard.importType}
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="max-w-2xl mx-auto flex flex-col gap-6 py-12">
 <Card className="p-10 rounded-[2.5rem] flex flex-col items-center gap-8 border-none shadow-2xl bg-muted/50 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-5">
 <Database className="w-40 h-40" />
 </div>

 <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
 <Save className="w-10 h-10 text-foreground" />
 </div>

 <div className="text-center max-w-sm">
 <h3 className="text-headline-lg font-semibold mb-3">{t('commit_step')}</h3>
 <p className="text-muted-foreground text-body-md font-medium leading-relaxed">
 {t('commit_warning', { count: wizard.data.length })}
 </p>
 </div>

 <div className="w-full h-px bg-muted/50" />

 <div className="flex gap-4 w-full">
 <Button 
 variant="outline" 
 className="flex-1 h-14 rounded-2xl border-cyan-500/10"
 disabled={wizard.isCommitting}
 onClick={wizard.prevStep}
 >
 <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
 {tc('back')}
 </Button>
 <Button 
 className="px-6 py-2.5 bg-[#0B1220] text-white font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
 disabled={wizard.isCommitting}
 onClick={wizard.handleCommit}
 >
 {wizard.isCommitting ? (
 <>
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 Committing...
 </>
 ) : (
 <>
 <Save className="w-4 h-4 me-2" />
 Confirm & Save
 </>
 )}
 </Button>
 </div>
 </Card>
 </div>
 );
}
