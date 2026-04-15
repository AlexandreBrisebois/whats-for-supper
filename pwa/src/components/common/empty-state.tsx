interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <h3 className="font-semibold text-charcoal">{title}</h3>
      {description && <p className="text-sm text-charcoal-400">{description}</p>}
      {action}
    </div>
  );
}
