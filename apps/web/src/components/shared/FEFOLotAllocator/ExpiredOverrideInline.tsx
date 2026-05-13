'use client';

export function ExpiredOverrideInline({ onReasonChange }: { onReasonChange: (reason: string) => void }) {
 
 return (
 <div className="mt-2 text-body-md bg-status-warning/10 border border-status-warning/30 rounded-xl p-3">
 <div className="text-status-warning font-bold mb-2">
 تحذير: هذا المنتج منتهي الصلاحية — يجب إدخال سبب الاستخدام
 </div>
 <textarea 
 className="w-full bg-surface-container border rounded-lg p-2 text-foreground focus:border-status-warning outline-none min-h-[60px]"
 onChange={(e) => onReasonChange(e.target.value)}
 placeholder="سبب الاستخدام / Override reason"
 required
 />
 </div>
 );
}
