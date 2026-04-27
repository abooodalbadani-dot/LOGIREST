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
    <div className="overflow-x-auto border border-surface-3 rounded bg-surface-1">
      <table className="w-full text-sm text-left rtl:text-right">
        <thead className="bg-surface-2 text-on-surface-muted border-b border-surface-3">
          <tr>
            <th className="px-4 py-3 font-medium">Field</th>
            <th className="px-4 py-3 font-medium">Old Value</th>
            <th className="px-4 py-3 font-medium">New Value</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, i) => {
            const isAdded = change.old_value === null && change.new_value !== null;
            const isDeleted = change.old_value !== null && change.new_value === null;
            const bgClass = isDeleted ? 'bg-red-500/10' : isAdded ? 'bg-emerald-500/10' : 'bg-amber-500/10';
            
            return (
              <tr key={i} className={`border-b border-surface-3 ${bgClass}`}>
                <td className="px-4 py-3 font-mono text-on-surface-muted max-w-[150px] truncate" title={change.field}>
                  {change.field}
                </td>
                <td className="px-4 py-3 break-all">
                  {renderValue(change.old_value)}
                </td>
                <td className="px-4 py-3 break-all">
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
