// Grey placeholder blocks shown while a page loads
function Block({ className }: { className: string }) {
  return <div className={`rounded-md bg-muted motion-safe:animate-pulse ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-6">
      <Block className="h-4 w-24" />
      <Block className="h-8 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Block key={i} className="h-20" />
        ))}
      </div>
      <Block className="h-64" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}