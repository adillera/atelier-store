// Shared building blocks for admin pages.

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-8">
      <div className="stack gap-2">
        <h1 className="heading-display-sm">{title}</h1>
        {description ? (
          <p className="max-w-xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function AdminSkeleton() {
  return (
    <div aria-hidden="true" className="stack gap-4">
      <div className="h-8 w-48 bg-surface" />
      <div className="h-4 w-80 max-w-full bg-surface" />
      <div className="mt-6 h-64 bg-surface" />
    </div>
  );
}

// Placeholder body for sections whose tools arrive in later steps.
export function ComingNext({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline stack gap-2 p-6 text-sm text-ink-muted">
      <p className="text-eyebrow">Coming next</p>
      <p>{children}</p>
    </div>
  );
}
