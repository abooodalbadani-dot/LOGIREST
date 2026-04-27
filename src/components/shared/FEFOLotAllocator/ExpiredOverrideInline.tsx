'use client';
import { useTranslations } from 'next-intl';

export function ExpiredOverrideInline({ onReasonChange }: { onReasonChange: (reason: string) => void }) {
  const t = useTranslations('common');
  
  return (
    <div className="mt-2 text-sm bg-amber-500/10 border border-amber-500/30 rounded p-3">
      <div className="text-amber-500 font-bold mb-2">
        تحذير: هذا المنتج منتهي الصلاحية — يجب إدخال سبب الاستخدام
      </div>
      <textarea 
        className="w-full bg-surface-2 border border-surface-3 rounded p-2 text-on-surface focus:border-amber-500 outline-none min-h-[60px]"
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="سبب الاستخدام / Override reason"
        required
      />
    </div>
  );
}
