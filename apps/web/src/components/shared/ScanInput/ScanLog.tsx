'use client';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';

interface ScanLogEntry {
 barcode: string;
 item_name: string;
 timestamp: Date;
 success: boolean;
}

export function ScanLog({ entries }: { entries: ScanLogEntry[] }) {
 const recent = [...entries].reverse().slice(0, 10);
 
 return (
 <div className="flex flex-col gap-2">
 {recent.map((entry, i) => (
 <div key={i} className={`flex items-center justify-between p-2 rounded text-body-md ${entry.success ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}>
 <div className="flex flex-col">
 <span className="font-medium">{entry.item_name}</span>
 <span dir="ltr" className="text-label-sm opacity-80 font-mono">{entry.barcode}</span>
 </div>
 <span dir="ltr" className="font-mono opacity-80 text-label-sm">
 <ClientOnlyTime date={entry.timestamp} locale="en" fallback="..." />
 </span>
 </div>
 ))}
 </div>
 );
}
