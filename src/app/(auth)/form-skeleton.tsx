export function FormSkeleton({ fields }: { fields: number }) {
  return (
    <div aria-hidden="true" className="stack gap-6">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="stack gap-3">
          <div className="h-3 w-16 bg-surface" />
          <div className="h-10 bg-surface" />
        </div>
      ))}
      <div className="mt-5 h-12 bg-surface" />
    </div>
  );
}
