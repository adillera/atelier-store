// Shared page sections (account and admin): the section heading, definition list
// rows, the loading skeleton and the "member since" date.

export function AccountSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="stack gap-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="heading-section">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DetailList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="hairline-t">
      {items.map((item) => (
        <div
          key={item.label}
          className="hairline-b grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="text-eyebrow sm:pt-0.5">{item.label}</dt>
          <dd className="text-sm break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AccountSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="stack gap-4">
      <div className="h-6 w-48 bg-surface" />
      <div className="stack hairline-t">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="hairline-b py-4">
            <div className="h-4 w-2/3 bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatMemberSince(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}
