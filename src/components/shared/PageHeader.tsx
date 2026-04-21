export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
      <div className="mb-4 md:mb-0">
        <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        {description && <p className="text-sm text-on-surface-muted mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center space-x-2 space-x-reverse">{actions}</div>}
    </div>
  );
}
