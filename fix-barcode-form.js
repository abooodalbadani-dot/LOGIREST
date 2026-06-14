const fs = require('fs');
let file = 'apps/web/src/app/[locale]/(app)/master-data/barcodes/BarcodeFormClient.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('onFormError')) {
  content = content.replace(/import \{ toast \} from 'sonner';/, "import { toast } from 'sonner';\nimport { onFormError } from '@/hooks/useFormError';");
}

// 1. onSubmit fix
content = content.replace(
  /const onSubmit = handleSubmit\(async \(values\) => \{\n\s*if \(isReadOnly \|\| codeError\) return;/,
  `const onSubmit = handleSubmit(async (values) => {
    if (isReadOnly) return;
    if (codeError) {
      toast.error(codeError);
      return;
    }`
);
content = content.replace(/\}, undefined\);/, '}, onFormError);');

// 2. defaultValues
content = content.replace(
  /defaultValues: \{ \n        itemId: '', \n        uomId: '', \n        code: '', \n        defaultQty: 1,\n        isActive: true,\n        version: undefined\n      \},/,
  `defaultValues: { 
        itemId: '', 
        code: '', 
        version: undefined
      },`
);

// 3. reset
content = content.replace(
  /reset\(\{ \n        itemId: barcode\.itemId, \n        uomId: barcode\.uomId,\n        code: barcode\.code, \n        defaultQty: barcode\.defaultQty,\n        isActive: barcode\.isActive,\n        version: barcode\.version\n      \}\);/,
  `reset({ 
        itemId: barcode.itemId, 
        code: barcode.code, 
        version: barcode.version
      });`
);

// 4. uomItems useMemo
content = content.replace(/const uomItems = useMemo\(\(\) => \{[\s\S]*?\}\);/, '');

// 5. uomId block
content = content.replace(/<div className="space-y-2">\n   <Label htmlFor="bc-uom"[\s\S]*?<\/div>\n\n  <div className="space-y-2">\n  <Label htmlFor="bc-qty"/, '<div className="space-y-2">\n  <Label htmlFor="bc-qty"');

// 6. defaultQty block
content = content.replace(/<div className="space-y-2">\n  <Label htmlFor="bc-qty"[\s\S]*?<\/div>\n <\/div>\n <\/CardContent>\n <\/Card>/, '</div>\n </CardContent>\n </Card>');

// 7. isActive block
content = content.replace(/<div className="space-y-8">\n <Card className="bg-surface-container-low border-none rounded-md overflow-hidden\">\n <CardContent className="p-8 space-y-6\">\n <div className="flex items-center gap-3 pb-4 border-b border-surface-variant\/10\">\n <div className="w-10 h-10 rounded-md bg-status-active\/10 flex items-center justify-center\">\n <Settings2 className="w-5 h-5 text-status-active" \/>\n <\/div>\n <div>\n <h3 className="text-body-md font-semibold text-foreground uppercase">\{tb\('configuration'\)\}<\/h3>\n <p className="text-label-xs font-semibold text-muted-foreground\/60 uppercase mt-0\.5">\{tb\('operational_status'\)\}<\/p>\n <\/div>\n <\/div>\n \n <div className="flex items-center justify-between p-4 bg-surface-container-highest\/10 rounded-md border border-surface-variant\/5\">\n <div className="space-y-0\.5\">\n <Label className="text-label-xs font-bold uppercase text-foreground\/80">\{tb\('active_status_label'\)\}<\/Label>\n <p className="text-label-xxs text-muted-foreground uppercase font-medium">\{tb\('active_status_desc'\)\}<\/p>\n <\/div>\n  <Controller\n  name="isActive"\n  control=\{control\}\n  render=\{\(\{ field \}\) => \(\n                   <Switch\n                     checked=\{field\.value\}\n                     onCheckedChange=\{field\.onChange\}\n                     disabled=\{isReadOnly\}\n                     className="data-\\[state=checked\\]:bg-status-active"\n                   \/>\n  \)\}\n  \/>\n <\/div>\n <\/CardContent>\n <\/Card>\n\n <Card className="bg-surface-container-low border-none rounded-md overflow-hidden">/, '<Card className="bg-surface-container-low border-none rounded-md overflow-hidden">');

fs.writeFileSync(file, content);
console.log('Success');
