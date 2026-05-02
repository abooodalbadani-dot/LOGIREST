'use client';

interface DiffEntry {
 field: string;
 old_value: unknown;
 new_value: unknown;
}

export function AuditDiffViewer({ changes }: { changes: DiffEntry[] }) {
 if (!changes || changes.length === 0) return null;

 const renderValue = (val: unknown) => {
 if (val === null || val === undefined) return '—';
 if (typeof val === 'object') {
 return JSON.stringify(val);
 }
 if (typeof val === 'number') {
 return <span dir="ltr" className="font-mono">{val}</span>;
 }
 return String(val);
 };

 return (
 <div className="overflow-x-auto rounded-[2.5rem] bg-surface-container-low shadow-sm">
 <table className="w-full text-start border-collapse">
 <thead className="bg-surface-container-high/50 text-muted-foreground">
 <tr>
 <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap">Field</th>
 <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap">Old Value</th>
 <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap">New Value</th>
 </tr>
 </thead>
 <tbody>
 {changes.map((change, i) => {
 const isAdded = change.old_value === null && change.new_value !== null;
 const isDeleted = change.old_value !== null && change.new_value === null;
 
 // Tonal indicator based on type of change
 const indicatorClass = isDeleted ? 'bg-status-error/20' : isAdded ? 'bg-status-success/20' : 'bg-status-warning/20';
 
 return (
 <tr key={i} className="transition-all hover:bg-primary/[0.04] h-14">
 <td className="px-6 font-mono text-label-xs text-muted-foreground/60 max-w-[150px] truncate" title={change.field}>
 <div className="flex items-center gap-3">
 <div className={`w-1.5 h-1.5 rounded-full ${indicatorClass}`} />
 {change.field}
 </div>
 </td>
 <td className="px-6 text-label-xs font-medium text-foreground/80 break-all">
 {renderValue(change.old_value)}
 </td>
 <td className="px-6 text-label-xs font-medium text-foreground/80 break-all">
 {renderValue(change.new_value)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 );
}
